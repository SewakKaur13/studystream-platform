import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { quizStore } from "@/stores/quizStore";
import { Quiz, QuizAttempt, Student } from "@/types/quiz";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Clock, Trophy, BarChart3, Lock } from "lucide-react";
import { motion } from "framer-motion";

const Dashboard = () => {
  const { user } = useAuth();
  const student = user as Student;
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);

  useEffect(() => {
    setQuizzes(quizStore.getQuizzes());
    setAttempts(quizStore.getAttempts(student.id));
  }, [student.id]);

  const avgScore = attempts.length > 0
    ? Math.round(attempts.reduce((s, a) => s + a.percentage, 0) / attempts.length)
    : 0;

  const stats = [
    { icon: BookOpen, label: "Available Quizzes", value: quizzes.length, color: "text-primary" },
    { icon: Trophy, label: "Completed", value: attempts.length, color: "text-success" },
    { icon: BarChart3, label: "Avg Score", value: `${avgScore}%`, color: "text-accent" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Welcome, {student.name}!</h1>
          <p className="text-muted-foreground">Ready to test your knowledge?</p>
        </div>

        {/* Stats */}
        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          {stats.map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
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
          {quizzes.map((quiz) => {
            const locked = quizStore.isLocked(quiz.id, student.id);
            const attempted = attempts.filter((a) => a.quizId === quiz.id);
            return (
              <Card key={quiz.id} className={`transition-shadow hover:shadow-elevated ${locked ? "opacity-60" : ""}`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{quiz.title}</CardTitle>
                    {locked && <Lock className="h-5 w-5 text-destructive" />}
                  </div>
                  <CardDescription>{quiz.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-4 flex flex-wrap gap-2 text-xs">
                    <Badge variant="secondary"><Clock className="mr-1 h-3 w-3" />{quiz.timeLimit} min</Badge>
                    <Badge variant="secondary">{quiz.questions.length} questions</Badge>
                    <Badge variant="secondary">{quiz.marksPerQuestion} marks each</Badge>
                  </div>
                  {attempted.length > 0 && (
                    <p className="mb-3 text-xs text-muted-foreground">
                      Last score: {attempted[attempted.length - 1].percentage}%
                    </p>
                  )}
                  {locked ? (
                    <p className="text-xs text-destructive">Locked due to tab switching. Try again later.</p>
                  ) : (
                    <Link to={`/quiz/${quiz.id}`}>
                      <Button size="sm" className="w-full gradient-hero text-primary-foreground">Start Quiz</Button>
                    </Link>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Recent Attempts */}
        {attempts.length > 0 && (
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
                  {[...attempts].reverse().slice(0, 5).map((a) => (
                    <tr key={a.id} className="border-t border-border">
                      <td className="p-3">{a.quizTitle}</td>
                      <td className="p-3">{a.score}/{a.totalMarks}</td>
                      <td className="p-3">
                        <Badge variant={a.percentage >= 70 ? "default" : a.percentage >= 40 ? "secondary" : "destructive"}>
                          {a.percentage}%
                        </Badge>
                      </td>
                      <td className="p-3 text-muted-foreground">{new Date(a.completedAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
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
