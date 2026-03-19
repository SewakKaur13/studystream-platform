import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ReactNode } from "react";

export const StudentRoute = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated, userType } = useAuth();
  if (!isAuthenticated || userType !== "student") return <Navigate to="/login" replace />;
  return <>{children}</>;
};

export const AdminRoute = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated, userType } = useAuth();

  if (!isAuthenticated || userType !== "admin") {
    return <Navigate to="/admin/login" replace />;
  }

  return <>{children}</>;
};
