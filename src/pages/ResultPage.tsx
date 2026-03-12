import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { quizStore } from "@/stores/quizStore";
import { QuizAttempt } from "@/types/quiz";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Trophy, ArrowLeft, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";

const ResultPage = () => {
  const { attemptId } = useParams<{ attemptId: string }>();
  const [attempt, setAttempt] = useState<QuizAttempt | null>(null);

  useEffect(() => {
    const all = quizStore.getAttempts();
    const found = all.find((a) => a.id === attemptId);
    setAttempt(found || null);
  }, [attemptId]);

  if (!attempt) return <div className="flex min-h-screen items-center justify-center">Loading...</div>;

  const grade = attempt.percentage >= 90 ? "A+" : attempt.percentage >= 80 ? "A" : attempt.percentage >= 70 ? "B" : attempt.percentage >= 60 ? "C" : attempt.percentage >= 40 ? "D" : "F";
  const gradeColor = attempt.percentage >= 70 ? "text-success" : attempt.percentage >= 40 ? "text-warning" : "text-destructive";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container max-w-2xl py-12">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}>
          <Card className="shadow-elevated">
            <CardHeader className="text-center">
              {attempt.autoSubmitted && (
                <div className="mb-4 inline-flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive mx-auto">
                  <AlertTriangle className="h-4 w-4" /> Auto-submitted due to tab switching
                </div>
              )}
              <div className="mb-4">
                <Trophy className={`mx-auto h-16 w-16 ${gradeColor}`} />
              </div>
              <CardTitle className="text-3xl">{attempt.quizTitle}</CardTitle>
              <p className="text-muted-foreground">Quiz Results</p>
            </CardHeader>
            <CardContent>
              {/* Score circle */}
              <div className="mb-8 flex justify-center">
                <div className={`flex h-32 w-32 flex-col items-center justify-center rounded-full border-4 ${
                  attempt.percentage >= 70 ? "border-success" : attempt.percentage >= 40 ? "border-warning" : "border-destructive"
                }`}>
                  <span className={`text-4xl font-bold ${gradeColor}`}>{attempt.percentage}%</span>
                  <span className="text-sm text-muted-foreground">Grade: {grade}</span>
                </div>
              </div>

              {/* Stats grid */}
              <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="rounded-lg bg-muted p-4 text-center">
                  <p className="text-2xl font-bold">{attempt.score}</p>
                  <p className="text-xs text-muted-foreground">Score</p>
                </div>
                <div className="rounded-lg bg-muted p-4 text-center">
                  <p className="text-2xl font-bold">{attempt.totalMarks}</p>
                  <p className="text-xs text-muted-foreground">Total Marks</p>
                </div>
                <div className="rounded-lg bg-success/10 p-4 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <CheckCircle2 className="h-5 w-5 text-success" />
                    <p className="text-2xl font-bold text-success">{attempt.correctCount}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">Correct</p>
                </div>
                <div className="rounded-lg bg-destructive/10 p-4 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <XCircle className="h-5 w-5 text-destructive" />
                    <p className="text-2xl font-bold text-destructive">{attempt.wrongCount}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">Wrong</p>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Link to="/dashboard" className="flex-1">
                  <Button variant="outline" className="w-full">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
                  </Button>
                </Link>
                <Link to="/profile" className="flex-1">
                  <Button className="w-full gradient-hero text-primary-foreground">View Profile</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default ResultPage;
