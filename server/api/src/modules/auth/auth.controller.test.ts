import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockRes } from "../../test/mocks.ts";

const authService = vi.hoisted(() => ({
  registerUser: vi.fn(),
  loginUser: vi.fn(),
  logoutUser: vi.fn(),
  refreshAccessToken: vi.fn(),
}));

const User = vi.hoisted(() => ({
  findById: vi.fn(),
}));

vi.mock("./auth.service.ts", () => authService);
vi.mock("./user.model.ts", () => ({ User }));

describe("auth.controller — POST register/login/logout/refresh + GET me", () => {
  beforeEach(() => vi.clearAllMocks());

  it("registerUser returns 201", async () => {
    authService.registerUser.mockResolvedValue({
      _id: "u1",
      name: "Ada",
      email: "ada@example.com",
      role: "Recruiter",
    });
    const { registerUser } = await import("./auth.controller.ts");
    const res = mockRes();
    await registerUser(
      {
        body: {
          name: "Ada Lovelace",
          email: "ada@example.com",
          password: "Password1!",
          role: "Recruiter",
        },
      } as never,
      res as never,
      vi.fn() as never,
    );
    expect(res.statusCode).toBe(201);
    expect(res.body).toMatchObject({ message: "User registered successfully" });
  });

  it("loginUser returns tokens", async () => {
    authService.loginUser.mockResolvedValue({
      accessToken: "a",
      refreshToken: "r",
    });
    const { loginUser } = await import("./auth.controller.ts");
    const res = mockRes();
    await loginUser(
      { body: { email: "ada@example.com", password: "Password1!" } } as never,
      res as never,
      vi.fn() as never,
    );
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ accessToken: "a", refreshToken: "r" });
  });

  it("logoutUser requires auth", async () => {
    const { logoutUser } = await import("./auth.controller.ts");
    const next = vi.fn();
    await logoutUser({ user: undefined } as never, mockRes() as never, next as never);
    expect(next).toHaveBeenCalled();
  });

  it("logoutUser succeeds", async () => {
    authService.logoutUser.mockResolvedValue(undefined);
    const { logoutUser } = await import("./auth.controller.ts");
    const res = mockRes();
    await logoutUser({ user: { id: "u1" } } as never, res as never, vi.fn() as never);
    expect(res.statusCode).toBe(200);
  });

  it("refreshToken returns access token", async () => {
    authService.refreshAccessToken.mockResolvedValue({ accessToken: "new" });
    const { refreshToken } = await import("./auth.controller.ts");
    const res = mockRes();
    await refreshToken(
      { body: { refreshToken: "r" } } as never,
      res as never,
      vi.fn() as never,
    );
    expect(res.body).toMatchObject({ accessToken: "new" });
  });

  it("me returns current user", async () => {
    const q = {
      select: vi.fn().mockResolvedValue({ _id: "u1", name: "Ada", email: "a@b.com", role: "Recruiter" }),
    };
    User.findById.mockReturnValue(q);
    const { me } = await import("./auth.controller.ts");
    const res = mockRes();
    await me({ user: { id: "u1" } } as never, res as never);
    expect(res.body).toMatchObject({ success: true });
  });
});
