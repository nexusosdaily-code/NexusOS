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
      if (token) {
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
        localStorage.removeItem("auth_token");
        setUser(null);
        setIsLoading(false);
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
  const [shouldRedirect, setShouldRedirect] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated && location !== "/auth") {
      setShouldRedirect(true);
    }
  }, [isLoading, isAuthenticated, location]);

  useEffect(() => {
    if (shouldRedirect) {
      setLocation("/auth", { replace: true });
      setShouldRedirect(false);
    }
  }, [shouldRedirect, setLocation]);

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
