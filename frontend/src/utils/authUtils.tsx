import { useNavigate } from "react-router-dom";

export const useAuthRedirect = () => {
  const navigate = useNavigate();
  const redirectToLogin = () => {
    navigate("/login");
  };
  return { redirectToLogin };
};
