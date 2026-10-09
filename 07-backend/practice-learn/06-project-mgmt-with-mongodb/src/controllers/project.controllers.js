import { User } from "../models/user.models.js";
import { Project } from "../models/project.models.js";
import { ProjectMember } from "../models/projectmember.models.js";
import { ApiResponse } from "../utils/api-response.js";
import { ApiError } from "../utils/api-error.js";
import { asyncHandler } from "../utils/async-handler.js";
import mongoose from "mongoose";
import { AvailableUserRole, UserRolesEnum } from "../utils/constants.js";

const getProjects = asyncHandler(async (req, res) => {
  const projects = await ProjectMember.aggregate([
    {
      $match: {
        user: new mongoose.Types.ObjectId(req.user._id),
      },
    },
    {
      $lookup: {
        from: "projects",
        localField: "project",
        foreignField: "_id",
        as: "projectDetails",
        pipeline: [
          {
            $lookup: {
              from: "projectmembers",
              localField: "_id",
              foreignField: "project",
              as: "membersList",
            },
          },
          {
            $addFields: {
              members: {
                $size: "$membersList",
              },
            },
          },
        ],
      },
    },
    {
      $unwind: "$projectDetails",
    },
    {
      $project: {
        _id: "$projectDetails._id",
        name: "$projectDetails.name",
        description: "$projectDetails.description",
        members: "$projectDetails.members",
        createdAt: "$projectDetails.createdAt",
        createdBy: "$projectDetails.createdBy",
        role: "$role",
      },
    },
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, projects, "Projects fetched successfully"));
});

const getProjectById = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const project = await Project.findById(projectId);

  if (!project) {
    throw new ApiError(404, "Project not found");
  }

  const memberCount = await ProjectMember.countDocuments({
    project: projectId,
  });

  const projectData = {
    ...project.toObject(),
    members: memberCount,
  };

  return res
    .status(200)
    .json(new ApiResponse(200, projectData, "Project fetched successfully"));
});

const createProject = asyncHandler(async (req, res) => {
  const { name, description } = req.body;

  const project = await Project.create({
    name,
    description,
    createdBy: req.user._id,
  });

  await ProjectMember.create({
    user: req.user._id,
    project: project._id,
    role: UserRolesEnum.ADMIN,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, project, "Project created Successfully"));
});

const updateProject = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  const { projectId } = req.params;

  const project = await Project.findByIdAndUpdate(
    projectId,
    {
      name,
      description,
    },
    { new: true },
  );

  if (!project) {
    throw new ApiError(404, "Project not found");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, project, "Project updated successfully"));
});

const deleteProject = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  const project = await Project.findByIdAndDelete(projectId);
  if (!project) {
    throw new ApiError(404, "Project not found");
  }

  // Clean up project members
  await ProjectMember.deleteMany({ project: projectId });

  return res
    .status(200)
    .json(new ApiResponse(200, project, "Project deleted successfully"));
});

const addMembersToProject = asyncHandler(async (req, res) => {
  const { email, role } = req.body;
  const { projectId } = req.params;

  const user = await User.findOne({ email: email.toLowerCase() });

  if (!user) {
    throw new ApiError(404, "User does not exist");
  }

  const existingMember = await ProjectMember.findOne({
    project: projectId,
    user: user._id,
  });

  if (existingMember) {
    throw new ApiError(409, "User is already a member of this project");
  }

  const projectMember = await ProjectMember.create({
    user: user._id,
    project: projectId,
    role: role || UserRolesEnum.MEMBER,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, projectMember, "Project member added successfully"));
});

const getProjectMembers = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const project = await Project.findById(projectId);

  if (!project) {
    throw new ApiError(404, "Project not found");
  }

  const projectMembers = await ProjectMember.aggregate([
    {
      $match: {
        project: new mongoose.Types.ObjectId(projectId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "user",
        foreignField: "_id",
        as: "user",
        pipeline: [
          {
            $project: {
              _id: 1,
              username: 1,
              fullName: 1,
              avatar: 1,
              email: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        user: {
          $arrayElemAt: ["$user", 0],
        },
      },
    },
    {
      $project: {
        project: 1,
        user: 1,
        role: 1,
        createdAt: 1,
        updatedAt: 1,
        _id: 1,
      },
    },
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, projectMembers, "Project members fetched"));
});

const updateMemberRole = asyncHandler(async (req, res) => {
  const { projectId, userId } = req.params;
  const targetRole = req.body.role || req.body.newRole;

  if (!targetRole || !AvailableUserRole.includes(targetRole)) {
    throw new ApiError(400, "Invalid or missing role");
  }

  let projectMember = await ProjectMember.findOne({
    project: projectId,
    user: userId,
  });

  if (!projectMember) {
    throw new ApiError(404, "Project member not found");
  }

  projectMember.role = targetRole;
  await projectMember.save();

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        projectMember,
        "Project member role updated successfully",
      ),
    );
});

const deleteMember = asyncHandler(async (req, res) => {
  const { projectId, userId } = req.params;

  let projectMember = await ProjectMember.findOneAndDelete({
    project: projectId,
    user: userId,
  });

  if (!projectMember) {
    throw new ApiError(404, "Project member not found");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        projectMember,
        "Project member deleted successfully",
      ),
    );
});

export {
  addMembersToProject,
  createProject,
  deleteMember,
  getProjects,
  getProjectById,
  getProjectMembers,
  updateProject,
  deleteProject,
  updateMemberRole,
};
