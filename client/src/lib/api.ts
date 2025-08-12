import axios from "axios";
import { getAuthTokenFromCookie } from "./authService";

// Dev: rely on Vite proxy (/api -> backend). Prod: use VITE_API_BASE_URL.
const isDev = import.meta.env.DEV;
const api = axios.create({
  baseURL: isDev ? '' : (import.meta.env.VITE_API_BASE_URL || ''),
  timeout: 10000,
  withCredentials: true, // Essential for session-based auth
  headers: {
    "Content-Type": "application/json",
  },
});

// Add request interceptor to include auth token on every request
api.interceptors.request.use(
  (config) => {
    const token = getAuthTokenFromCookie();
    if (token) {
      console.log("[API] Adding auth token to request:", config.url);
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      console.log(
        "[API] No auth token, relying on session cookies for:",
        config.url
      );
    }
    return config;
  },
  (error) => {
    console.error("[API] Request preparation error:", error);
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("[API] Error response:", {
      status: error.response?.status,
      data: error.response?.data,
      url: error.config?.url,
    });
    return Promise.reject(error);
  }
);

export { api };