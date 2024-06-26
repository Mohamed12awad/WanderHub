import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import { QueryClient, QueryClientProvider } from "react-query";

import { AuthProvider } from "./contexts/authContext";
import DefaultLayout from "./pages/main";
import PrivateRoute from "./components/PrivateRoute";
import { ThemeProvider } from "./contexts/ThemeProvider";

const queryClient = new QueryClient();

const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route
                path="/*"
                element={
                  <PrivateRoute>
                    <DefaultLayout />
                  </PrivateRoute>
                }
              />
            </Routes>
          </ThemeProvider>
        </QueryClientProvider>
      </AuthProvider>
    </Router>
  );
};

export default App;
