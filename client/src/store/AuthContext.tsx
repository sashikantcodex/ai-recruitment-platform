"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { loginRequest, logoutRequest, meRequest } from "@/services/auth.service";
import type { User } from "@/types";
import { storage } from "@/utils/storage";

type AuthContextValue = {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const boot = async () => {
      const token = storage.getAccessToken();
      const cached = storage.getUser<User>();

      if (!token) {
        setIsLoading(false);
        return;
      }

      if (cached) setUser(cached);

      try {
        const me = await meRequest();
        storage.setUser(me);
        setUser(me);
      } catch {
        storage.clear();
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    void boot();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const tokens = await loginRequest(email, password);
    storage.setTokens(tokens.accessToken, tokens.refreshToken);
    const me = await meRequest();
    storage.setUser(me);
    setUser(me);
  }, []);

  const logout = useCallback(async () => {
    await logoutRequest();
    storage.clear();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isLoading,
      login,
      logout,
    }),
    [user, isLoading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthStore() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthStore must be used within AuthProvider");
  return ctx;
}
