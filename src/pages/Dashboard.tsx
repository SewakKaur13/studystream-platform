import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Clock, Trophy, BarChart3, Lock } from "lucide-react";
import { motion } from "framer-motion";
import api from "@/api/axios";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const { user } = useAuth();
  const student = user;

  const [studentDashboard, setStudentDashboard] = useState({
    quizzes: [] as any[],
    attempts: [] as any[],
    avgScore: "0",
  });
  const [recentAttempts, setRecentAttempts] = useState<any[]>([]);
  const [startingQuizId, setStartingQuizId] = useState<string | null>(null);
  const studentName = sessionStorage.getItem("name");
  const navigate = useNavigate();

  // Fetch dynamic data from backend Dashboard API
  useEffect(() => {
    const fetchStudentDashboard = async () => {
      try {
        const res = await api.get("/student/dashboard");
        setStudentDashboard(res.data);
      } catch (error: any) {
        console.error("Failed to fetch student dashboard", error);
        toast.error(
          error?.response?.data?.message || "Failed to load dashboard",
        );
      }
    };

    fetchStudentDashboard();
  }, []);

  const quizzes = studentDashboard?.quizzes || [];
  const attempts = studentDashboard?.attempts || [];

  const stats = [
    {
      icon: BookOpen,
      label: "Available Quizzes",
      value: quizzes?.length,
      color: "text-primary",
    },
    {
      icon: Trophy,
      label: "Completed",
      value: attempts?.length,
      color: "text-success",
    },
    {
      icon: BarChart3,
      label: "Avg Score",
      value: `${studentDashboard?.avgScore}%`,
      color: "text-accent",
    },
  ];

  // Fetch recent attempts for the table
  useEffect(() => {
    const fetchRecentAttempts = async () => {
      try {
        const res = await api.get("/student/recent-attempts");
        setRecentAttempts(res.data);
      } catch (error) {
        console.error("Failed to fetch recent attempts", error);
      }
    };

    fetchRecentAttempts();
  }, []);

  // Helper function to get lock message based on lockedUntil time
  const getLockMessage = (lockedUntil: string) => {
    const now = new Date();
    const lockDate = new Date(lockedUntil);

    const diffMs = lockDate.getTime() - now.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    // If approx 24 hours
    if (diffHours > 23 && diffHours <= 24) {
      return "Available after 1 day";
    }

    // If less than 24 hours → show hours
    if (diffHours < 24) {
      return `Available in ${Math.ceil(diffHours)} hours`;
    }

    // Fallback → full date
    return `Locked until ${lockDate.toLocaleString()}`;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Welcome, {studentName}!</h1>
          <p className="text-muted-foreground">Ready to test your knowledge?</p>
        </div>

        {/* Stats */}
        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card>
                <CardContent className="flex items-center gap-4 p-6">
                  <div className={`rounded-lg bg-muted p-3 ${s.color}`}>
                    <s.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{s.value}</p>
                    <p className="text-sm text-muted-foreground">{s.label}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Quizzes */}
        <h2 className="mb-4 text-xl font-semibold">Available Quizzes</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {quizzes?.map((quiz) => {
            const attempted = attempts.filter((a) => a.quizId === quiz._id);
            const locked = quiz.locked || false;

            return (
              <Card
                key={quiz._id}
                className={`transition-all duration-200 
                  ${
                    locked
                      ? "bg-muted/40 border-muted text-muted-foreground cursor-not-allowed"
                      : "hover:shadow-elevated"
                  }`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{quiz.title}</CardTitle>
                    {locked && <Lock className="h-5 w-5 text-destructive" />}
                  </div>
                  <CardDescription>{quiz.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-4 flex flex-wrap gap-2 text-xs">
                    <Badge variant="secondary">
                      <Clock className="mr-1 h-3 w-3" />
                      {quiz.duration} min
                    </Badge>
                    <Badge variant="secondary">
                      {quiz.questions.length} questions
                    </Badge>
                    <Badge variant="secondary">
                      {quiz.marksPerQuestion} marks each
                    </Badge>
                  </div>
                  {attempted.length > 0 && (
                    <p className="mb-3 text-xs text-muted-foreground">
                      Last score: {attempted[attempted.length - 1].percentage}%
                    </p>
                  )}
                  {locked ? (
                    <div className="space-y-2">
                      <p className="text-xs text-destructive font-medium flex items-center gap-1">
                        <Lock className="h-3 w-3" />
                        Quiz locked
                      </p>

                      {quiz.lockedUntil && (
                        <p className="text-[11px] text-muted-foreground">
                          {getLockMessage(quiz.lockedUntil)}
                        </p>
                      )}

                      <Button size="sm" disabled className="w-full">
                        Locked
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      disabled={startingQuizId === quiz._id}
                      className="w-full gradient-hero text-primary-foreground"
                      onClick={() => {
                        setStartingQuizId(quiz._id);
                        navigate(`/quiz/${quiz._id}`);
                      }}
                    >
                      {startingQuizId === quiz._id
                        ? "Starting..."
                        : "Start Quiz"}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Recent Attempts */}
        {recentAttempts?.length > 0 && (
          <div className="mt-10">
            <h2 className="mb-4 text-xl font-semibold">Recent Attempts</h2>

            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="p-3 text-left font-medium">Quiz</th>
                    <th className="p-3 text-left font-medium">Score</th>
                    <th className="p-3 text-left font-medium">Percentage</th>
                    <th className="p-3 text-left font-medium">Date</th>
                  </tr>
                </thead>

                <tbody>
                  {recentAttempts.slice(0, 5).map((a, i) => {
                    const percentageNumber = parseFloat(a?.percentage);

                    return (
                      <tr key={i} className="border-t border-border">
                        <td className="p-3">{a?.quizTitle}</td>

                        <td className="p-3">{a?.score}</td>

                        <td className="p-3">
                          <Badge
                            variant={
                              percentageNumber >= 70
                                ? "default"
                                : percentageNumber >= 40
                                  ? "secondary"
                                  : "destructive"
                            }
                          >
                            {a?.percentage}
                          </Badge>
                        </td>

                        <td className="p-3 text-muted-foreground">
                          {new Date(a.date).toLocaleDateString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
