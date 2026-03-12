import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { Student, Admin } from "@/types/quiz";
import { mockStudents, mockAdmins } from "@/data/mockData";

type UserType = "student" | "admin" | null;

interface AuthState {
  user: Student | Admin | null;
  userType: UserType;
  isAuthenticated: boolean;
}

interface AuthContextType extends AuthState {
  loginStudent: (enrollment: string, password: string) => boolean;
  loginAdmin: (username: string, password: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [auth, setAuth] = useState<AuthState>(() => {
    const saved = localStorage.getItem("quizAuth");
    if (saved) {
      try { return JSON.parse(saved); } catch { /* ignore */ }
    }
    return { user: null, userType: null, isAuthenticated: false };
  });

  const persist = (state: AuthState) => {
    localStorage.setItem("quizAuth", JSON.stringify(state));
    setAuth(state);
  };

  const loginStudent = useCallback((enrollment: string, password: string) => {
    const student = mockStudents.find(
      (s) => s.enrollmentNumber === enrollment && s.password === password
    );
    if (student) {
      persist({ user: student, userType: "student", isAuthenticated: true });
      return true;
    }
    return false;
  }, []);

  const loginAdmin = useCallback((username: string, password: string) => {
    const admin = mockAdmins.find(
      (a) => a.username === username && a.password === password
    );
    if (admin) {
      persist({ user: admin, userType: "admin", isAuthenticated: true });
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("quizAuth");
    setAuth({ user: null, userType: null, isAuthenticated: false });
  }, []);

  return (
    <AuthContext.Provider value={{ ...auth, loginStudent, loginAdmin, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
