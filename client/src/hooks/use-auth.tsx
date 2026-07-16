import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { useLocation } from "wouter";

interface User {
  id: string;
  username?: string;
  email?: string | null;
  role?: string;
  isAdmin?: boolean;
  walletAddress?: string;
  balanceUnits?: string;
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

  const fetchUser = useCallback(async (attempt = 1) => {
    try {
      const token = localStorage.getItem("auth_token");
      const headers: Record<string, string> = {};
      if (token && token !== "undefined" && token !== "null") {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch("/api/auth/me", {
        headers,
        credentials: "include",
      });

      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setIsLoading(false);
      } else if (res.status === 401 || res.status === 403) {
        if (attempt < 3) {
          // Retry — the session may have just been created and a transient
          // DB connection issue is causing a false 401.  Give it up to two
          // extra tries before evicting the token.
          setTimeout(() => fetchUser(attempt + 1), 600 * attempt);
        } else {
          localStorage.removeItem("auth_token");
          setUser(null);
          setIsLoading(false);
        }
      } else if (attempt < 3) {
        setTimeout(() => fetchUser(attempt + 1), 1500 * attempt);
      } else {
        setUser(null);
        setIsLoading(false);
      }
    } catch {
      if (attempt < 3) {
        setTimeout(() => fetchUser(attempt + 1), 1500 * attempt);
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
    try {
      const token = localStorage.getItem("auth_token");
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: token ? { "Authorization": `Bearer ${token}` } : {},
        credentials: "include",
      });
    } finally {
      localStorage.removeItem("auth_token");
      setUser(null);
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
      const redirect = location !== "/auth" ? `?redirect=${encodeURIComponent(location)}` : "";
      setLocation(`/auth${redirect}`, { replace: true });
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
