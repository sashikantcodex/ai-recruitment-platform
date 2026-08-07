import axios from "axios";
import { storage } from "../utils/storage";

/**
 * Shared Axios client for Express `/api/v1`.
 * Base URL comes from NEXT_PUBLIC_API_URL (baked in at build time for Docker).
 */
export const http = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: { "Content-Type": "application/json" },
});

http.interceptors.request.use((config) => {
  const token = storage.getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Browser must set multipart boundary for FormData uploads.
  if (typeof FormData !== "undefined" && config.data instanceof FormData) {
    delete config.headers["Content-Type"];
  }
  return config;
});
