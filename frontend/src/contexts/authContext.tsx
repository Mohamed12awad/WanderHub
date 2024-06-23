import axios from "axios";
import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from "react";
// TypeScript interface for the user object
interface User {
  name: string;
  email: string;
  role: string;
}
import { useNavigate } from "react-router-dom";

// TypeScript interface for the AuthContext
interface AuthContextProps {
  user: User | null;
  isLoggedIn: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
  error: string | null;
}

// Create the AuthContext with a default value of undefined
const AuthContext = createContext<AuthContextProps | undefined>(undefined);

// AuthProvider component
export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();

  // Function to handle login
  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post(
        `${process.env.VITE_API_URL}/auth/signin`,
        { email, password }
      );
      if (response.status === 200) {
        setIsLoggedIn(true);
        setUser(response.data.user);
        localStorage.setItem("user", JSON.stringify(response.data.user));
        localStorage.setItem("token", response.data.token); // Store token in localStorage
        axios.defaults.headers.common[
          "Authorization"
        ] = `Bearer ${response.data.token}`; // Set default header for axios
        // console.log("you logged in ", response.data.user);
        navigate("/");
      }
    } catch (error) {
      setError("Login failed. Please check your credentials and try again.");
      console.error("Login failed", error);
    } finally {
      setLoading(false);
    }
  };

  // Function to handle logout
  const logout = () => {
    setIsLoggedIn(false);
    setUser(null);
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    delete axios.defaults.headers.common["Authorization"]; // Remove default header for axios
    navigate("/login");
  };

  // Check if user is already logged in on component mount
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const storedToken = localStorage.getItem("token");
    if (storedUser && storedToken) {
      setUser(JSON.parse(storedUser));
      setIsLoggedIn(true);
      axios.defaults.headers.common["Authorization"] = `Bearer ${storedToken}`; // Set default header for axios
    }
  }, []);
  // useEffect(() => {
  //   if (user) {
  //     navigate("postConsent");
  //   }
  // }, [user]);

  return (
    <AuthContext.Provider
      value={{ user, isLoggedIn, login, logout, loading, error }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the AuthContext
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
