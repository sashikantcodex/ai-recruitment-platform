"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuthStore } from "@/store/AuthContext";
import type { Role } from "@/types";

type AuthGuardResult = {
  user: ReturnType<typeof useAuthStore>["user"];
  isAuthenticated: boolean;
  isLoading: boolean;
  isAllowed: boolean;
};

/** Protects authenticated routes; optionally restricts by role. */
export function useAuthGuard(allowedRoles?: Role[]): AuthGuardResult {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuthStore();

  const isAllowed =
    !allowedRoles || !user ? Boolean(user) : allowedRoles.includes(user.role);

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }

    if (allowedRoles && user && !allowedRoles.includes(user.role)) {
      router.replace("/dashboard");
    }
  }, [allowedRoles, isAuthenticated, isLoading, router, user]);

  return { user, isAuthenticated, isLoading, isAllowed };
}
