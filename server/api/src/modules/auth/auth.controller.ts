import type { Request, Response } from "express";
import { z } from "zod";
import { PUBLIC_REGISTER_ROLES } from "../../config/role.ts";
import { AppError } from "../../utils/App.Error.ts";
import { asyncHandler } from "../../utils/asyncHandler.ts";
import * as authService from "./auth.service.ts";
import { User } from "./user.model.ts";

// Public registration: any PUBLIC_REGISTER_ROLES value (not Super Admin).
const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(PUBLIC_REGISTER_ROLES),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const registerUser = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, password, role } = registerSchema.parse(req.body);
  const user = await authService.registerUser(name, email, password, role);
  res.status(201).json({
    message: "User registered successfully",
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
});

export const loginUser = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = loginSchema.parse(req.body);
  const { accessToken, refreshToken } = await authService.loginUser(email, password);
  res.status(200).json({ message: "User logged in successfully", accessToken, refreshToken });
});

export const logoutUser = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
  await authService.logoutUser(req.user.id);
  res.status(200).json({ message: "User logged out successfully" });
});

export const refreshToken = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken: token } = req.body;
  const { accessToken } = await authService.refreshAccessToken(token);
  res.status(200).json({ message: "Token refreshed successfully", accessToken });
});

export async function me(req: Request, res: Response) {
  if (!req.user) throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
  const user = await User.findById(req.user.id).select("-passwordHash -refreshTokens");
  res.json({ success: true, data: user });
}
