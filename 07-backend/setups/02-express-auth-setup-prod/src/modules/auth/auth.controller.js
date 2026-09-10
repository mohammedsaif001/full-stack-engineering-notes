import * as authService from "./auth.service.js";
import ApiResponse from "../../common/utils/api-response.js";
import ApiError from "../../common/utils/api-error.js";
import asyncHandler from "../../common/utils/async-handler.js";

const register = asyncHandler(async (req, res) => {
  const user = await authService.register(req.body);
  return ApiResponse.created(res, "User registered successfully", user);
});

const refreshToken = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken;
  const { accessToken } = await authService.refresh(token);
  return ApiResponse.ok(res, "Token refreshed", { accessToken });
});

const login = asyncHandler(async (req, res) => {
  const { user, accessToken, refreshToken } = await authService.login(req.body);

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return ApiResponse.ok(res, "Logged in successfully", { user, accessToken });
});

const logout = asyncHandler(async (req, res) => {
  await authService.logout(req.user.id);
  res.clearCookie("refreshToken");
  return ApiResponse.ok(res, "Logged out successfully");
});

const verifyEmail = asyncHandler(async (req, res) => {
  await authService.verifyEmail(req.params.token);
  return ApiResponse.ok(res, "Email verified successfully");
});

const forgotPassword = asyncHandler(async (req, res) => {
  await authService.forgotPassword(req.body.email);
  return ApiResponse.ok(res, "Password reset email sent");
});

const resetPassword = asyncHandler(async (req, res) => {
  await authService.resetPassword(req.params.token, req.body.password);
  return ApiResponse.ok(res, "Password reset successful");
});

const getMe = asyncHandler(async (req, res) => {
  const user = await authService.getMe(req.user.id);
  return ApiResponse.ok(res, "User profile", user);
});

const uploadAvatar = asyncHandler(async (req, res) => {
  const file = req.file;

  if (!file) {
    throw ApiError.badRequest("No file uploaded. Please send file with field name 'avatar'");
  }

  const result = await authService.avatarUpload(req.user.id, file);

  return ApiResponse.ok(res, "Avatar uploaded successfully", {
    avatarUrl: result.url,
  });
});

export {
  register,
  login,
  refreshToken,
  logout,
  verifyEmail,
  forgotPassword,
  resetPassword,
  getMe,
  uploadAvatar,
};