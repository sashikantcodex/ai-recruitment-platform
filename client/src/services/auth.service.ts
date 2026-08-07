import type { PublicRegisterRole, User } from "../types";
import { mapMeUser } from "../utils/auth.mapper";
import { http } from "./http.service";

type LoginResponse = {
  message: string;
  accessToken: string;
  refreshToken: string;
};

type RegisterResponse = {
  message: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: User["role"];
  };
};

type MeResponse = {
  success: boolean;
  data: {
    _id: string;
    name: string;
    email: string;
    role: User["role"];
  };
};

export async function registerRequest(input: {
  name: string;
  email: string;
  password: string;
  role: PublicRegisterRole;
}) {
  const { data } = await http.post<RegisterResponse>("/auth/register", input);
  return data.user;
}

export async function loginRequest(email: string, password: string) {
  const { data } = await http.post<LoginResponse>("/auth/login", { email, password });
  return {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
  };
}

export async function meRequest() {
  const { data } = await http.get<MeResponse>("/auth/me");
  return mapMeUser(data.data);
}

export async function logoutRequest() {
  try {
    await http.post("/auth/logout");
  } catch {
    // ignore logout network errors; local session is still cleared
  }
}
