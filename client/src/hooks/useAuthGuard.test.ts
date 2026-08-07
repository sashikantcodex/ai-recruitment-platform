import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useAuthGuard } from "./useAuthGuard";

const replace = vi.fn();
const auth = vi.hoisted(() => ({
  user: null as null | { id: string; name: string; email: string; role: string },
  isAuthenticated: false,
  isLoading: false,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

vi.mock("@/store/AuthContext", () => ({
  useAuthStore: () => auth,
}));

describe("useAuthGuard", () => {
  beforeEach(() => {
    replace.mockClear();
    auth.user = null;
    auth.isAuthenticated = false;
    auth.isLoading = false;
  });

  it("redirects unauthenticated users to login", async () => {
    renderHook(() => useAuthGuard());
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/login"));
  });

  it("allows matching roles", () => {
    auth.user = { id: "u1", name: "A", email: "a@b.com", role: "Recruiter" };
    auth.isAuthenticated = true;
    const { result } = renderHook(() => useAuthGuard(["Recruiter"]));
    expect(result.current.isAllowed).toBe(true);
  });

  it("redirects disallowed roles to dashboard", async () => {
    auth.user = { id: "u1", name: "A", email: "a@b.com", role: "Candidate" };
    auth.isAuthenticated = true;
    renderHook(() => useAuthGuard(["Recruiter"]));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/dashboard"));
  });
});
