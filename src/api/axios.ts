import axios from "axios";

const api = axios.create({
  baseURL: "https://study-stream-api.onrender.com/api",
  withCredentials: true
});

export default api;