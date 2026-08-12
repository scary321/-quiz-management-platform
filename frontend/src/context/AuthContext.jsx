import { createContext, useCallback, useContext, useMemo, useState } from "react";
import api from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("qp_user");
    return raw ? JSON.parse(raw) : null;
  });

  const persist = useCallback((data) => {
    localStorage.setItem("qp_token", data.access_token);
    localStorage.setItem("qp_user", JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }, []);

  const login = useCallback(
    async (payload) => persist((await api.post("/auth/login", payload)).data),
    [persist]
  );

  const register = useCallback(
    async (payload) => persist((await api.post("/auth/register", payload)).data),
    [persist]
  );

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      /* token may already be gone */
    }
    localStorage.removeItem("qp_token");
    localStorage.removeItem("qp_user");
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, login, register, logout, isAdmin: user?.role === "ADMIN" }),
    [user, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
