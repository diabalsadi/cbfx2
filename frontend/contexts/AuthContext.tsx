"use client";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";

interface User {
  email: string;
  name: string | null;
  role: string;
  region: string | null;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(async (jwt: string) => {
    try {
      const res = await fetch("/api/proxy/users/me", {
        headers: { Authorization: `Bearer ${jwt}` },
      });
      if (!res.ok) throw new Error("Unauthorized");
      const data = await res.json();
      setUser(data);
    } catch {
      localStorage.removeItem("cbfx_token");
      setToken(null);
      setUser(null);
    }
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem("cbfx_token");
    if (stored) {
      setToken(stored);
      fetchMe(stored).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [fetchMe]);

  // Best-effort IP-based region classification for this visit. Works for
  // anonymous visitors too; when a token is present the backend persists the
  // detected region on the user's account so it stays fresh across visits.
  useEffect(() => {
    const stored = localStorage.getItem("cbfx_token");
    fetch("/api/proxy/geo/detect", {
      headers: stored ? { Authorization: `Bearer ${stored}` } : {},
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { region: string | null } | null) => {
        if (data?.region) {
          setUser((prev) => (prev ? { ...prev, region: data.region } : prev));
        }
      })
      .catch(() => {});
  }, []);

  const login = async (email: string, password: string) => {
    const res = await fetch("/api/proxy/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Login failed");
    }
    const data = await res.json();
    const jwt = data.access_token;
    localStorage.setItem("cbfx_token", jwt);
    setToken(jwt);
    await fetchMe(jwt);
  };

  const logout = () => {
    localStorage.removeItem("cbfx_token");
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
