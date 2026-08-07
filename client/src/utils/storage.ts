/** Client-side token/user persistence for JWT auth. */
const ACCESS = "accessToken";
const REFRESH = "refreshToken";
const USER = "user";

function canUseStorage() {
  return typeof window !== "undefined";
}

export const storage = {
  getAccessToken: () => (canUseStorage() ? localStorage.getItem(ACCESS) : null),
  getRefreshToken: () => (canUseStorage() ? localStorage.getItem(REFRESH) : null),
  setTokens: (access: string, refresh: string) => {
    if (!canUseStorage()) return;
    localStorage.setItem(ACCESS, access);
    localStorage.setItem(REFRESH, refresh);
  },
  clear: () => {
    if (!canUseStorage()) return;
    localStorage.removeItem(ACCESS);
    localStorage.removeItem(REFRESH);
    localStorage.removeItem(USER);
  },
  getUser: <T>() => {
    if (!canUseStorage()) return null;
    const raw = localStorage.getItem(USER);
    return raw ? (JSON.parse(raw) as T) : null;
  },
  setUser: (user: unknown) => {
    if (!canUseStorage()) return;
    localStorage.setItem(USER, JSON.stringify(user));
  },
};
