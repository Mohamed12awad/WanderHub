import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import { QueryClient, QueryClientProvider } from "react-query";

import { AuthProvider } from "./contexts/authContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import DefaultLayout from "./pages/main";
import PrivateRoute from "./components/PrivateRoute";
import { ThemeProvider } from "./contexts/ThemeProvider";
import { Toaster } from "./components/ui/toaster";
import { SearchPalette } from "./components/common/SearchPalette";

const queryClient = new QueryClient();

const App: React.FC = () => {
  return (
    <LanguageProvider>
      <Router>
        <AuthProvider>
          <QueryClientProvider client={queryClient}>
            <ThemeProvider>
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
              <Toaster />
              <SearchPalette />
            </ThemeProvider>
          </QueryClientProvider>
        </AuthProvider>
      </Router>
    </LanguageProvider>
  );
};

export default App;
