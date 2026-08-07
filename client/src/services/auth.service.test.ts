import { beforeEach, describe, expect, it, vi } from "vitest";

const http = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}));

vi.mock("./http.service", () => ({ http }));

describe("auth.service", () => {
  beforeEach(() => vi.clearAllMocks());

  it("registerRequest / loginRequest / meRequest / logoutRequest", async () => {
    http.post
      .mockResolvedValueOnce({
        data: {
          message: "ok",
          user: { id: "u1", name: "Ada", email: "a@b.com", role: "Recruiter" },
        },
      })
      .mockResolvedValueOnce({
        data: { message: "ok", accessToken: "a", refreshToken: "r" },
      })
      .mockResolvedValueOnce({});
    http.get.mockResolvedValue({
      data: {
        success: true,
        data: { _id: "u1", name: "Ada", email: "a@b.com", role: "Recruiter" },
      },
    });

    const svc = await import("./auth.service");
    expect(
      await svc.registerRequest({
        name: "Ada",
        email: "a@b.com",
        password: "Password1!",
        role: "Recruiter",
      }),
    ).toMatchObject({ id: "u1" });
    expect(await svc.loginRequest("a@b.com", "Password1!")).toEqual({
      accessToken: "a",
      refreshToken: "r",
    });
    expect(await svc.meRequest()).toMatchObject({ id: "u1", email: "a@b.com" });
    await svc.logoutRequest();
    expect(http.post).toHaveBeenCalledWith("/auth/logout");
  });

  it("logoutRequest swallows network errors", async () => {
    http.post.mockRejectedValueOnce(new Error("offline"));
    const svc = await import("./auth.service");
    await expect(svc.logoutRequest()).resolves.toBeUndefined();
  });
});
