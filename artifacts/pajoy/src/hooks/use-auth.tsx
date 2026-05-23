import React, { createContext, useContext, useEffect, useState } from "react";
import { useGetMe, useLogin, useLogout } from "@workspace/api-client-react";
import type { LoginInput, User } from "@workspace/api-client-react/src/generated/api.schemas";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (data: LoginInput) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: meData, isLoading, error } = useGetMe({
    query: {
      retry: false,
    }
  });

  useEffect(() => {
    if (meData) {
      setUser(meData);
    } else if (error) {
      setUser(null);
    }
  }, [meData, error]);

  const loginMutation = useLogin();
  const logoutMutation = useLogout();

  const handleLogin = async (data: LoginInput) => {
    try {
      const response = await loginMutation.mutateAsync({ data });
      setUser(response.user);
      setLocation("/");
      toast({ title: "Logged in successfully" });
    } catch (err: any) {
      toast({ 
        title: "Login failed", 
        description: err?.message || "Please check your credentials",
        variant: "destructive"
      });
      throw err;
    }
  };

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
      setUser(null);
      setLocation("/login");
      toast({ title: "Logged out successfully" });
    } catch (err) {
      console.error("Logout failed", err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login: handleLogin, logout: handleLogout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
