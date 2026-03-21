import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";
import api from "@/api/axios";
import { Student, Admin } from "@/types/quiz";

type UserType = "student" | "admin" | null;

interface AuthState {
  user: Student | Admin | null;
  userType: UserType;
  isAuthenticated: boolean;
}

interface AuthContextType extends AuthState {
  loginStudent: (enrollment: string, password: string) => Promise<boolean>;
  loginAdmin: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [auth, setAuth] = useState<AuthState>(() => {
    const saved = localStorage.getItem("quizAuth");

    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return { user: null, userType: null, isAuthenticated: false };
      }
    }

    return { user: null, userType: null, isAuthenticated: false };
  });

  const persist = (state: AuthState) => {
    localStorage.setItem("quizAuth", JSON.stringify(state));
    setAuth(state);
  };

  const loginStudent = useCallback(
    async (enrollment: string, password: string) => {
      try {
        const res = await api.post("/auth/login", {
          enrollmentNumber: enrollment,
          password,
        });

        const data = res.data;

        const student: Student = {
          id: data.id,
          name: data.name,
          enrollmentNumber: data.enrollmentNumber,
        };

        persist({
          user: student,
          userType: "student",
          isAuthenticated: true,
        });

        sessionStorage.setItem("name", data.name);
        sessionStorage.setItem("enrollmentNumber", data.enrollmentNumber);
        localStorage.setItem("token", data.token);
        sessionStorage.setItem("token", data.token);

        return data;
      } catch (error: any) {
        throw error.response?.data?.message || "Login failed";
      }
    },
    [],
  );

  const loginAdmin = useCallback(async (username: string, password: string) => {
    try {
      const res = await api.post("/auth/login", {
        enrollmentNumber: username,
        password,
      });

      const data = res.data;

      const admin: Admin = {
        id: data.id,
        enrollmentNumber: data.enrollmentNumber,
        name: data.name,
      };

      persist({
        user: admin,
        userType: "admin",
        isAuthenticated: true,
      });

      localStorage.setItem("token", res.data.token);
      sessionStorage.setItem("token", res.data.token);
      sessionStorage.setItem("name", data.name);

      return data;
    } catch (error: any) {
      throw error.response?.data?.message || "Admin login failed";
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("quizAuth");
    localStorage.removeItem("token");

    sessionStorage.removeItem("name");
    sessionStorage.removeItem("enrollmentNumber");

    setAuth({
      user: null,
      userType: null,
      isAuthenticated: false,
    });
  }, []);

  return (
    <AuthContext.Provider value={{ ...auth, loginStudent, loginAdmin, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return ctx;
};
