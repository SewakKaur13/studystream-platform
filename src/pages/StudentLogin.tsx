import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";

const StudentLogin = () => {
  const [enrollment, setEnrollment] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { loginStudent } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!enrollment.trim() || !password.trim()) {
      setError("Please fill in all fields");
      return;
    }
    if (loginStudent(enrollment.trim(), password)) {
      navigate("/dashboard");
    } else {
      setError("Invalid enrollment number or password");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link to="/" className="inline-flex items-center gap-2 text-2xl font-bold text-primary font-heading">
            <BookOpen className="h-8 w-8" /> QuizMaster
          </Link>
        </div>
        <Card className="shadow-elevated">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Student Login</CardTitle>
            <CardDescription>Enter your enrollment number to continue</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" /> {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="enrollment">Enrollment Number</Label>
                <Input
                  id="enrollment"
                  placeholder="e.g. EN2024001"
                  value={enrollment}
                  onChange={(e) => setEnrollment(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full gradient-hero text-primary-foreground">
                Login
              </Button>
            </form>
            <p className="mt-4 text-center text-xs text-muted-foreground">
              Demo: EN2024001 / pass123
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StudentLogin;
