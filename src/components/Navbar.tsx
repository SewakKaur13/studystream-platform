import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut, User, LayoutDashboard, Menu, X } from "lucide-react";
import { useState } from "react";
import api from "@/api/axios";
import { toast} from "sonner";

const Navbar = () => {
  const { isAuthenticated, userType, user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Handle logout with API call and error handling
  const handleLogout = async () => {
  try {
    await api.post("/auth/logout");

    logout();
    toast.success("Logged out successfully");

    navigate(userType === "admin" ? "/admin/login" : "/login");
  } catch (error: any) {
    console.error("Logout failed", error);
    toast.error(error?.response?.data?.message || "Logout failed");
  }
};

  if (!isAuthenticated) return null;

  const isAdmin = userType === "admin";

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-md">
      <div className="container flex h-16 items-center justify-between">
        <Link to={isAdmin ? "/admin" : "/dashboard"} className="font-heading text-xl font-bold text-primary">
          QuizMaster
        </Link>

        {/* Desktop */}
        <div className="hidden items-center gap-4 md:flex">
          {!isAdmin && (
            <>
              <Link to="/dashboard" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                <LayoutDashboard className="inline mr-1 h-4 w-4" />Dashboard
              </Link>
              <Link to="/profile" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                <User className="inline mr-1 h-4 w-4" />Progress Report
              </Link>
            </>
          )}
          {/* <span className="text-sm text-muted-foreground">
            {isAdmin ? `Admin: ${"username" in (user as any) ? (user as any).username : ""}` : `${"name" in (user as any) ? (user as any).name : ""}`}
          </span> */}
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="mr-1 h-4 w-4" />Logout
          </Button>
        </div>

        {/* Mobile toggle */}
        <button className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-border bg-card p-4 md:hidden">
          <div className="flex flex-col gap-3">
            {!isAdmin && (
              <>
                <Link to="/dashboard" onClick={() => setMobileOpen(false)} className="text-sm font-medium">Dashboard</Link>
                <Link to="/profile" onClick={() => setMobileOpen(false)} className="text-sm font-medium">Progress Report</Link>
              </>
            )}
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="mr-1 h-4 w-4" />Logout
            </Button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
