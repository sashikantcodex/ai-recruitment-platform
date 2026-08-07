import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../../config/config.ts";
import type { Role } from "../../config/role.ts";
import { AppError } from "../../utils/App.Error.ts";
import { User, type UserDoc } from "./user.model.ts";

type AccessPayload = { sub: string; email: string; role: Role };
type RefreshPayload = { sub: string };

const hashPassword = async (password: string) => {
  return bcrypt.hash(password, 10);
};

const comparePassword = async (password: string, hash: string) => {
  return bcrypt.compare(password, hash);
};

/** Short-lived access JWT (15m) used by API auth middleware. */
const signAccessToken = (user: { id: string; email: string; role: Role }) => {
  const payload: AccessPayload = {
    sub: user.id,
    email: user.email,
    role: user.role,
  };
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: "15m" });
};

/** Long-lived refresh JWT (7d); also stored on the user document for revocation. */
const signRefreshToken = (userId: string) => {
  const payload: RefreshPayload = { sub: userId };
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: "7d" });
};

export async function registerUser(
  name: string,
  email: string,
  password: string,
  role: Role,
): Promise<UserDoc> {
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new AppError("User already exists", 400, "USER_ALREADY_EXISTS");
  }

  const hashedPassword = await hashPassword(password);
  return User.create({
    name,
    email,
    passwordHash: hashedPassword,
    role,
  });
}

export async function loginUser(
  email: string,
  password: string,
): Promise<{ accessToken: string; refreshToken: string }> {
  const user = await User.findOne({ email });
  if (!user) {
    throw new AppError("Invalid credentials", 401, "INVALID_CREDENTIALS");
  }

  const isPasswordValid = await comparePassword(password, user.passwordHash);
  if (!isPasswordValid) {
    throw new AppError("Invalid credentials", 401, "INVALID_CREDENTIALS");
  }

  const accessToken = signAccessToken({
    id: user._id.toString(),
    email: user.email,
    role: user.role,
  });
  const refreshToken = signRefreshToken(user._id.toString());

  // Persist refresh token so logout / revoke can invalidate it server-side.
  user.refreshTokens.push(refreshToken);
  await user.save();

  return { accessToken, refreshToken };
}

export async function logoutUser(userId: string): Promise<void> {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError("User not found", 404, "USER_NOT_FOUND");
  }

  user.refreshTokens = [];
  await user.save();
}

export async function refreshAccessToken(
  refreshToken: string,
): Promise<{ accessToken: string }> {
  if (!refreshToken) {
    throw new AppError("Refresh token required", 400, "REFRESH_TOKEN_REQUIRED");
  }

  let payload: RefreshPayload;
  try {
    payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as RefreshPayload;
  } catch {
    throw new AppError("Invalid or expired refresh token", 401, "UNAUTHORIZED");
  }

  const user = await User.findById(payload.sub);
  if (!user || !user.refreshTokens.includes(refreshToken)) {
    throw new AppError("Invalid refresh token", 401, "UNAUTHORIZED");
  }

  const accessToken = signAccessToken({
    id: user._id.toString(),
    email: user.email,
    role: user.role,
  });

  return { accessToken };
}
