import axios from "axios";

const api = axios.create({
  baseURL: "https://study-stream-api.onrender.com/api",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json"
  }
});

// interceptor
api.interceptors.request.use((config) => {

  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;

});

export default api;