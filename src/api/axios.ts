import axios from "axios";
import { jwtDecode } from "jwt-decode";

/** Custom Token Type */
type MyTokenPayload = {
  id: string;
  role: string;
  exp: number;
};

/** Axios Instance */
const api = axios.create({
  baseURL: "https://study-stream-api.onrender.com/api",
  withCredentials: true,
});

/** REQUEST INTERCEPTOR (Attach Token) */
api.interceptors.request.use(
  (config) => {
    const token =
      localStorage.getItem("token") ||
      sessionStorage.getItem("token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

/** RESPONSE INTERCEPTOR (Handle 401 + Redirect) */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const token =
        localStorage.getItem("token") ||
        sessionStorage.getItem("token");

      let role: string | null = null;

      try {
        if (token) {
          const decoded = jwtDecode<MyTokenPayload>(token);
          role = decoded.role;
        }
      } catch (e) {
        console.log("Invalid token");
      }

      // Clear storage
      localStorage.removeItem("token");
      sessionStorage.removeItem("token");

      // Redirect based on role
      if (role === "admin") {
        window.location.href = "/admin/login";
      } else {
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

export default api;