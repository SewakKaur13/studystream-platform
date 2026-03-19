import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { StudentRoute, AdminRoute } from "@/components/ProtectedRoute";
import Landing from "./pages/Landing";
import StudentLogin from "./pages/StudentLogin";
import AdminLogin from "./pages/AdminLogin";
import Dashboard from "./pages/Dashboard";
import QuizPage from "./pages/QuizPage";
import ResultPage from "./pages/ResultPage";
import Profile from "./pages/Profile";
import AdminPanel from "./pages/AdminPanel";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>

      <Toaster
        position="top-center"
        richColors
        expand
      />

      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<StudentLogin />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/dashboard" element={<StudentRoute><Dashboard /></StudentRoute>} />
            <Route path="/quiz/:id" element={<StudentRoute><QuizPage /></StudentRoute>} />
            <Route path="/result/:attemptId" element={<StudentRoute><ResultPage /></StudentRoute>} />
            <Route path="/profile" element={<StudentRoute><Profile /></StudentRoute>} />
            <Route path="/admin" element={<AdminRoute><AdminPanel /></AdminRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>

    </TooltipProvider>
  </QueryClientProvider>
);

export default App;