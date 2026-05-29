import axios from "axios";
import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from "react";
import { useNavigate } from "react-router-dom";

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
        { email, password }
      );
      if (response.status === 200) {
        setIsLoggedIn(true);
        setUser(response.data.user);
        localStorage.setItem("user", JSON.stringify(response.data.user));
        localStorage.setItem("token", response.data.token);
        if (response.data.refreshToken) {
          localStorage.setItem("refreshToken", response.data.refreshToken);
        }
        axios.defaults.headers.common[
          "Authorization"
        ] = `Bearer ${response.data.token}`;
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
    // Revoke the refresh token server-side (best effort), then clear locally.
    const refreshToken = localStorage.getItem("refreshToken");
    if (refreshToken) {
      axios
        .post(`${import.meta.env.VITE_API_URL}auth/logout`, { refreshToken })
        .catch(() => undefined);
    }
    setIsLoggedIn(false);
    setUser(null);
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    delete axios.defaults.headers.common["Authorization"];
    navigate("/login");
  };

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const storedToken = localStorage.getItem("token");

    if (storedUser && storedToken) {
      setUser(JSON.parse(storedUser));
      setIsLoggedIn(true);
      axios.defaults.headers.common["Authorization"] = `Bearer ${storedToken}`;
    }
    setLoading(false); // Set loading to false after checking localStorage
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
