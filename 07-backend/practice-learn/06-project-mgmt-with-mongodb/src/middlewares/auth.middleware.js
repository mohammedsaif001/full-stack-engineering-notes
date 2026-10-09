import { User } from "../models/user.models.js";
import { ProjectMember } from "../models/projectmember.models.js";
import { ApiError } from "../utils/api-error.js";
import { asyncHandler } from "../utils/async-handler.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

export const verifyJWT = asyncHandler(async (req, res, next) => {
  const token =
    req.cookies?.accessToken ||
    req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    throw new ApiError(401, "Unauthorized request");
  }

  try {
    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    const user = await User.findById(decodedToken?._id).select(
      "-password -refreshToken -emailVerificationToken -emailVerificationExpiry",
    );

    if (!user) {
      throw new ApiError(401, "Invalid access token");
    }
    req.user = user;
    next();
  } catch (error) {
    throw new ApiError(401, "Invalid access token");
  }
});

export const validateProjectPermission = (roles = []) => {
  return asyncHandler(async (req, res, next) => {
    const { projectId } = req.params;

    if (!projectId || !mongoose.isValidObjectId(projectId)) {
      throw new ApiError(400, "Invalid or missing project id");
    }

    const projectMember = await ProjectMember.findOne({
      project: projectId,
      user: req.user._id,
    });

    if (!projectMember) {
      throw new ApiError(403, "You are not a member of this project");
    }

    const givenRole = projectMember.role;
    req.user.role = givenRole;

    if (roles.length > 0 && !roles.includes(givenRole)) {
      throw new ApiError(
        403,
        "You do not have permission to perform this action",
      );
    }

    next();
  });
};
