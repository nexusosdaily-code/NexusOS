import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import { useLocation } from "wouter";
import { queryClient } from "@/lib/queryClient";

interface User {
  id: string;
  username?: string;
  email?: string | null;
  role?: string;
  isAdmin?: boolean;
  walletAddress?: string;
  balanceUnits?: string;
  spectralBand?: string;
  spectralWdm?: number;
  spectralOam?: number;
  spectralPol?: string;
  spectralNm?: number;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  logout: () => Promise<void>;
  refetch: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const sessionGeneration = useRef(0);

  const fetchUser = useCallback(async (attempt = 1, generation = sessionGeneration.current) => {
    if (generation !== sessionGeneration.current) return;
    try {
      // Remove credentials retained by older builds; the HttpOnly cookie is
      // the only browser session credential.
      localStorage.removeItem("auth_token");
      sessionStorage.removeItem("auth_token");

      const res = await fetch("/api/auth/me", {
        credentials: "include",
      });
      if (generation !== sessionGeneration.current) return;

      if (res.ok) {
        const data = await res.json();
        if (generation !== sessionGeneration.current) return;
        setUser(data.user);
        setIsLoading(false);
      } else if (res.status === 401 || res.status === 403) {
        queryClient.clear();
        setUser(null);
        setIsLoading(false);
      } else if (attempt < 3) {
        setTimeout(() => fetchUser(attempt + 1, generation), 1500 * attempt);
      } else {
        setUser(null);
        setIsLoading(false);
      }
    } catch {
      if (generation !== sessionGeneration.current) return;
      if (attempt < 3) {
        setTimeout(() => fetchUser(attempt + 1, generation), 1500 * attempt);
      } else {
        setUser(null);
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const logout = useCallback(async () => {
    // An earlier identity response must not restore a user after sign-out.
    sessionGeneration.current++;
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok && response.status !== 401) throw new Error("Sign-out failed. Please try again.");
      await queryClient.cancelQueries();
      queryClient.clear();
      setUser(null);
      setIsLoading(false);
    } finally {
      localStorage.removeItem("auth_token");
      sessionStorage.removeItem("auth_token");
    }
  }, []);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    await fetchUser();
  }, [fetchUser]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        logout,
        refetch,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      if (location && location !== "/auth") {
        sessionStorage.setItem("auth_redirect", location);
      }
      setLocation("/auth", { replace: true });
    }
  }, [isLoading, isAuthenticated, location, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl font-light text-white tracking-widest mb-4 animate-pulse">
            Λ
          </div>
          <p className="text-gray-500 text-sm">Authenticating...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}

export function AuthLoading({ children }: { children: ReactNode }) {
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl font-light text-white tracking-widest mb-4 animate-pulse">
            Λ
          </div>
          <p className="text-gray-500 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
