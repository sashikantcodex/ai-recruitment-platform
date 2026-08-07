"use client";

/**
 * Global providers for the App Router:
 * - Emotion cache compatible with Next.js (SSR-safe MUI styles)
 * - MUI theme + CssBaseline
 * - Auth session context (JWT in localStorage)
 */
import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import { AuthProvider } from "@/store/AuthContext";
import { theme } from "@/theme";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <AppRouterCacheProvider>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthProvider>{children}</AuthProvider>
      </ThemeProvider>
    </AppRouterCacheProvider>
  );
}
