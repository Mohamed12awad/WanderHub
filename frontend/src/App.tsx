import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import { QueryClient, QueryClientProvider, QueryCache } from "@tanstack/react-query";
import { AxiosError } from "axios";

import { AuthProvider } from "./contexts/authContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import DefaultLayout from "./pages/main";
import PrivateRoute from "./components/PrivateRoute";
import { ThemeProvider } from "./contexts/ThemeProvider";
import { Toaster } from "./components/ui/toaster";
import { toast } from "./components/ui/use-toast";
import { SearchPalette } from "./components/common/SearchPalette";
import { ErrorBoundary } from "./components/common/ErrorBoundary";

const queryClient = new QueryClient({
  // Surface background query failures the user would otherwise never see.
  queryCache: new QueryCache({
    onError: (error) => {
      const status = (error as AxiosError)?.response?.status;
      // 401 → handled by the axios interceptor (refresh/redirect).
      // 403 → handled by route-level <Protected> guards; aggregate pages (e.g.
      // the dashboard) legitimately fire sub-queries the user can't see, so a
      // toast here would be noise. Stay quiet for both.
      if (status === 401 || status === 403) return;
      const data = (error as AxiosError<{ message?: string }>)?.response?.data;
      toast({
        title: data?.message ?? "Failed to load data. Please try again.",
        variant: "destructive",
      });
    },
  }),
  defaultOptions: {
    queries: {
      // Don't hammer the server on client/auth errors; only retry transient ones.
      retry: (failureCount, error) => {
        const status = (error as AxiosError)?.response?.status;
        if (status && status >= 400 && status < 500) return false;
        return failureCount < 2;
      },
      staleTime: 30_000,
    },
  },
});

const App: React.FC = () => {
  return (
    <LanguageProvider>
      <Router>
        <AuthProvider>
          <QueryClientProvider client={queryClient}>
            <ThemeProvider>
              <ErrorBoundary>
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
              </ErrorBoundary>
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
