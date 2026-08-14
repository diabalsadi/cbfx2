"use client";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { withDebugIp } from "@/helpers/debugIp";

interface User {
  email: string;
  name: string | null;
  role: string;
  region: string | null;
}

// Which portal a login is for. The backend only accepts admin-role accounts
// (super_admin/editor/broker) on "admin" and plain site users on "user" —
// the two never work interchangeably, even with a correct password.
export type Portal = "admin" | "user";

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string, portal: Portal) => Promise<void>;
  logout: () => void;
  // Re-fetches the current user (e.g. after editing profile info) so the
  // rest of the app picks up the change without a full reload.
  refreshUser: () => Promise<void>;
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
  //
  // Locally, the browser never sends a real forwardable client IP (see
  // backend/app/utils/geo.py), so region/country always come back null. Set
  // NEXT_PUBLIC_DEBUG_IP in frontend/.env.local to spoof one for testing; the
  // proxy only forwards it in dev (route.ts) and the backend only honors it
  // when ALLOW_DEV_IP_OVERRIDE=true, so this is a no-op in production.
  useEffect(() => {
    const stored = localStorage.getItem("cbfx_token");
    fetch(withDebugIp("/api/proxy/geo/detect"), {
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

  const login = async (email: string, password: string, portal: Portal) => {
    const res = await fetch("/api/proxy/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, portal }),
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

  const refreshUser = async () => {
    const stored = localStorage.getItem("cbfx_token");
    if (stored) await fetchMe(stored);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
