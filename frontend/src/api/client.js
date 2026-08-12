import axios from "axios";

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || "/api" });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("qp_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    if (status === 401 && !window.location.pathname.startsWith("/login")) {
      localStorage.removeItem("qp_token");
      localStorage.removeItem("qp_user");
      window.location.assign("/login");
    }
    return Promise.reject(error);
  }
);

export const message = (error, fallback = "Something went wrong. Try again.") =>
  error?.response?.data?.detail || fallback;

export default api;
