import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import { AuthProvider, useAuthStore } from "./AuthContext";

const auth = vi.hoisted(() => ({
  loginRequest: vi.fn(),
  logoutRequest: vi.fn(),
  meRequest: vi.fn(),
}));

vi.mock("@/services/auth.service", () => auth);

function Probe() {
  const { user, isAuthenticated, isLoading, login, logout } = useAuthStore();
  if (isLoading) return <div>loading</div>;
  return (
    <div>
      <span data-testid="auth">{isAuthenticated ? "yes" : "no"}</span>
      <span data-testid="user">{user?.email ?? "none"}</span>
      <button type="button" onClick={() => void login("a@b.com", "Password1!")}>
        login
      </button>
      <button type="button" onClick={() => void logout()}>
        logout
      </button>
    </div>
  );
}

describe("AuthContext", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("boots without token", async () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByTestId("auth").textContent).toBe("no"));
  });

  it("login and logout", async () => {
    auth.loginRequest.mockResolvedValue({ accessToken: "a", refreshToken: "r" });
    auth.meRequest.mockResolvedValue({
      id: "u1",
      name: "Ada",
      email: "a@b.com",
      role: "Recruiter",
    });
    auth.logoutRequest.mockResolvedValue(undefined);

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByTestId("auth").textContent).toBe("no"));

    await act(async () => {
      screen.getByText("login").click();
    });
    await waitFor(() => expect(screen.getByTestId("user").textContent).toBe("a@b.com"));

    await act(async () => {
      screen.getByText("logout").click();
    });
    await waitFor(() => expect(screen.getByTestId("auth").textContent).toBe("no"));
  });

  it("boots with token and refreshes me", async () => {
    localStorage.setItem("accessToken", "a");
    localStorage.setItem(
      "user",
      JSON.stringify({ id: "u1", name: "Ada", email: "a@b.com", role: "Recruiter" }),
    );
    auth.meRequest.mockResolvedValue({
      id: "u1",
      name: "Ada",
      email: "a@b.com",
      role: "Recruiter",
    });

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByTestId("user").textContent).toBe("a@b.com"));
  });

  it("clears session when me fails", async () => {
    localStorage.setItem("accessToken", "a");
    auth.meRequest.mockRejectedValue(new Error("expired"));
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByTestId("auth").textContent).toBe("no"));
  });
});
