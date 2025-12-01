// src/App.tsx
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/components/DashboardLayout";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import LiveTelemetry from "./pages/LiveTelemetry";
import Profile from "./pages/Profile";
import AdminManagement from "@/pages/admin/AdminManagement";
import LabelEditor from "@/pages/admin/LabelEditor";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Public */}
              <Route path="/login" element={<Login />} />

              {/* Protected area with layout */}
              <Route
                element={
                  <ProtectedRoute>
                    <DashboardLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Dashboard />} />
                <Route path="/telemetry" element={<LiveTelemetry />} />
                <Route path="/profile" element={<Profile />} />

                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute requireSuperuser>
                      <AdminManagement />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/labels"
                  element={
                    <ProtectedRoute requireSuperuser>
                      <LabelEditor />
                    </ProtectedRoute>
                  }
                />
              </Route>

              {/* 404 */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
