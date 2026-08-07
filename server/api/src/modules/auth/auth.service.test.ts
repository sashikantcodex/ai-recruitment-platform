import { beforeEach, describe, expect, it, vi } from "vitest";

const { User } = vi.hoisted(() => ({
  User: {
    findOne: vi.fn(),
    create: vi.fn(),
    findById: vi.fn(),
  },
}));

vi.mock("./user.model.ts", () => ({ User }));

describe("auth.service — register/login/logout/refresh", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("registerUser creates hashed user", async () => {
    User.findOne.mockResolvedValue(null);
    User.create.mockResolvedValue({
      _id: "u1",
      name: "Ada",
      email: "ada@example.com",
      role: "Recruiter",
    });

    const { registerUser } = await import("./auth.service.ts");
    const user = await registerUser("Ada", "ada@example.com", "Password1!", "Recruiter");
    expect(User.create).toHaveBeenCalled();
    expect(user.email).toBe("ada@example.com");
  });

  it("registerUser rejects duplicates", async () => {
    User.findOne.mockResolvedValue({ email: "ada@example.com" });
    const { registerUser } = await import("./auth.service.ts");
    await expect(
      registerUser("Ada", "ada@example.com", "Password1!", "Recruiter"),
    ).rejects.toMatchObject({ code: "USER_ALREADY_EXISTS" });
  });

  it("loginUser returns tokens for valid credentials", async () => {
    const bcrypt = await import("bcryptjs");
    const hash = await bcrypt.hash("Password1!", 10);
    const save = vi.fn().mockResolvedValue(undefined);
    User.findOne.mockResolvedValue({
      _id: { toString: () => "u1" },
      email: "ada@example.com",
      role: "Recruiter",
      passwordHash: hash,
      refreshTokens: [] as string[],
      save,
    });

    const { loginUser } = await import("./auth.service.ts");
    const tokens = await loginUser("ada@example.com", "Password1!");
    expect(tokens.accessToken).toBeTruthy();
    expect(tokens.refreshToken).toBeTruthy();
    expect(save).toHaveBeenCalled();
  });

  it("loginUser rejects unknown user", async () => {
    User.findOne.mockResolvedValue(null);
    const { loginUser } = await import("./auth.service.ts");
    await expect(loginUser("x@y.com", "Password1!")).rejects.toMatchObject({
      code: "INVALID_CREDENTIALS",
    });
  });

  it("loginUser rejects bad password", async () => {
    const bcrypt = await import("bcryptjs");
    const hash = await bcrypt.hash("Password1!", 10);
    User.findOne.mockResolvedValue({
      _id: { toString: () => "u1" },
      email: "ada@example.com",
      role: "Recruiter",
      passwordHash: hash,
      refreshTokens: [],
      save: vi.fn(),
    });

    const { loginUser } = await import("./auth.service.ts");
    await expect(loginUser("ada@example.com", "wrong")).rejects.toMatchObject({
      code: "INVALID_CREDENTIALS",
    });
  });

  it("logoutUser clears refresh tokens", async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    User.findById.mockResolvedValue({ refreshTokens: ["x"], save });
    const { logoutUser } = await import("./auth.service.ts");
    await logoutUser("u1");
    expect(save).toHaveBeenCalled();
  });

  it("logoutUser 404 when missing", async () => {
    User.findById.mockResolvedValue(null);
    const { logoutUser } = await import("./auth.service.ts");
    await expect(logoutUser("missing")).rejects.toMatchObject({ code: "USER_NOT_FOUND" });
  });

  it("refreshAccessToken issues new access token", async () => {
    const jwt = await import("jsonwebtoken");
    const refresh = jwt.default.sign({ sub: "u1" }, process.env.JWT_REFRESH_SECRET!, {
      expiresIn: "7d",
    });
    User.findById.mockResolvedValue({
      _id: { toString: () => "u1" },
      email: "ada@example.com",
      role: "Recruiter",
      refreshTokens: [refresh],
    });

    const { refreshAccessToken } = await import("./auth.service.ts");
    const result = await refreshAccessToken(refresh);
    expect(result.accessToken).toBeTruthy();
  });

  it("refreshAccessToken rejects empty token", async () => {
    const { refreshAccessToken } = await import("./auth.service.ts");
    await expect(refreshAccessToken("")).rejects.toMatchObject({
      code: "REFRESH_TOKEN_REQUIRED",
    });
  });

  it("refreshAccessToken rejects revoked token", async () => {
    const jwt = await import("jsonwebtoken");
    const refresh = jwt.default.sign({ sub: "u1" }, process.env.JWT_REFRESH_SECRET!, {
      expiresIn: "7d",
    });
    User.findById.mockResolvedValue({
      _id: { toString: () => "u1" },
      email: "ada@example.com",
      role: "Recruiter",
      refreshTokens: [],
    });
    const { refreshAccessToken } = await import("./auth.service.ts");
    await expect(refreshAccessToken(refresh)).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
