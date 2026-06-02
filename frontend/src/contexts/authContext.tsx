import axios from "axios";
import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from "react";
import { useNavigate } from "react-router-dom";
import { setAccessToken, clearAccessToken } from "../utils/tokenStore";
import { refreshAccessToken } from "../utils/api";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  permissions: string[];
}

export type AuthError = "network" | "credentials" | "blocked";

interface AuthContextProps {
  user: User | null;
  isLoggedIn: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  updateCurrentUser: (updates: Partial<User>) => void;
  loading: boolean;
  error: AuthError | null;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true); // Initially true to indicate loading
  const [error, setError] = useState<AuthError | null>(null);

  const navigate = useNavigate();

  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/auth/signin`,
        { email, password },
        { withCredentials: true }
      );
      if (response.status === 200) {
        // Access token kept in memory only; refresh token is an httpOnly cookie.
        setAccessToken(response.data.token);
        setIsLoggedIn(true);
        setUser(response.data.user);
        localStorage.setItem("user", JSON.stringify(response.data.user));
        navigate("/dashboard");
      }
    } catch (err) {
      if (axios.isAxiosError(err)) {
        if (!err.response) {
          setError("network");
        } else if (err.response.status === 403) {
          setError("blocked");
        } else {
          setError("credentials");
        }
      } else {
        setError("network");
      }
      console.error("Login failed", err);
    } finally {
      setLoading(false);
    }
  };

  const updateCurrentUser = (updates: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...updates };
      localStorage.setItem("user", JSON.stringify(updated));
      return updated;
    });
  };

  const logout = () => {
    // Revoke the refresh token server-side (reads the httpOnly cookie), then
    // clear local state.
    axios
      .post(`${import.meta.env.VITE_API_URL}/auth/logout`, {}, { withCredentials: true })
      .catch(() => undefined);
    setIsLoggedIn(false);
    setUser(null);
    localStorage.removeItem("user");
    clearAccessToken();
    navigate("/login");
  };

  useEffect(() => {
    // No access token survives a reload (it's in memory only), so restore the
    // session from the httpOnly refresh cookie.
    (async () => {
      const token = await refreshAccessToken();
      if (token) {
        const storedUser = localStorage.getItem("user");
        if (storedUser) setUser(JSON.parse(storedUser));
        setIsLoggedIn(true);
      } else {
        localStorage.removeItem("user");
        clearAccessToken();
      }
      setLoading(false);
    })();
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, isLoggedIn, login, logout, updateCurrentUser, loading, error }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
