import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import { QueryClient, QueryClientProvider } from "react-query";

import { AuthProvider } from "./contexts/authContext";
import DefaultLayout from "./pages/main";

const queryClient = new QueryClient();

const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <QueryClientProvider client={queryClient}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/*" element={<DefaultLayout />} />
            {/* <Route path="/signup" element={<Signup />} /> */}
            {/* <Route
              path="/dashboard"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            /> */}
            {/* <Route path="/admin" element={<RoleRoute roles={['admin']}><AdminPage /></RoleRoute>} /> */}
            {/* <Route path="/user" element={<PrivateRoute><UserPage /></PrivateRoute>} /> */}
          </Routes>
        </QueryClientProvider>
      </AuthProvider>
    </Router>
  );
};

export default App;
