import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { login as loginRequest, type LoginInput, type User } from "@workspace/api-client-react";
import { getCurrentRole, getValidSessionToken } from "@/lib/auth";

type AuthContextValue = {
  token: string | null;
  role: string | null;
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginInput) => Promise<User>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function getStoredUser(): User | null {
  const raw = localStorage.getItem("pajoy_user");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    localStorage.removeItem("pajoy_user");
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => getValidSessionToken());
  const [user, setUser] = useState<User | null>(() =>
    getValidSessionToken() ? getStoredUser() : null,
  );

  const login = useCallback(async (credentials: LoginInput) => {
    const response = await loginRequest(credentials);
    localStorage.setItem("pajoy_token", response.token);
    localStorage.setItem("pajoy_user", JSON.stringify(response.user));
    setToken(response.token);
    setUser(response.user);
    return response.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("pajoy_token");
    localStorage.removeItem("pajoy_user");
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    return {
      token,
      role: user?.role ?? getCurrentRole(),
      user,
      isLoading: false,
      isAuthenticated: Boolean(token),
      login,
      logout,
    };
  }, [login, logout, token, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (value) return value;
  const token = getValidSessionToken();
  const user = token ? getStoredUser() : null;
  return {
    token,
    role: user?.role ?? getCurrentRole(),
    user,
    isLoading: false,
    isAuthenticated: Boolean(token),
    login: async (credentials: LoginInput) => {
      const response = await loginRequest(credentials);
      localStorage.setItem("pajoy_token", response.token);
      localStorage.setItem("pajoy_user", JSON.stringify(response.user));
      return response.user;
    },
    logout: () => {
      localStorage.removeItem("pajoy_token");
      localStorage.removeItem("pajoy_user");
    },
  };
}
