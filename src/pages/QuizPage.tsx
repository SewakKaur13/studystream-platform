import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { quizStore } from "@/stores/quizStore";
import { Quiz, Student, QuizAttempt } from "@/types/quiz";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

const QuizPage = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const student = user as Student;
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [started, setStarted] = useState(false);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [tabSwitches, setTabSwitches] = useState(0);
  const tabSwitchRef = useRef(0);
  const submittedRef = useRef(false);

  useEffect(() => {
    if (!id) return;
    if (quizStore.isLocked(id, student.id)) {
      toast.error("This quiz is locked. Try again later.");
      navigate("/dashboard");
      return;
    }
    const q = quizStore.getQuiz(id);
    if (q) {
      setQuiz(quizStore.shuffleQuestions(q));
      setTimeLeft(q.timeLimit * 60);
    }
  }, [id, student.id, navigate]);

  const submitQuiz = useCallback((auto = false) => {
    if (submittedRef.current || !quiz) return;
    submittedRef.current = true;

    let correct = 0;
    quiz.questions.forEach((q) => {
      if (answers[q.id] === q.correctAnswer) correct++;
    });
    const wrong = quiz.questions.length - correct;
    const score = correct * quiz.marksPerQuestion;
    const total = quiz.questions.length * quiz.marksPerQuestion;
    const percentage = Math.round((score / total) * 100);

    const attempt: QuizAttempt = {
      id: `att_${Date.now()}`,
      quizId: quiz.id,
      quizTitle: quiz.title,
      studentId: student.id,
      answers,
      score,
      totalMarks: total,
      correctCount: correct,
      wrongCount: wrong,
      percentage,
      completedAt: new Date().toISOString(),
      autoSubmitted: auto,
    };

    quizStore.addAttempt(attempt);

    if (auto) {
      quizStore.lockQuiz(quiz.id, student.id, 1);
      toast.error("Quiz auto-submitted due to tab switching!");
    }

    navigate(`/result/${attempt.id}`);
  }, [quiz, answers, student.id, navigate]);

  // Timer
  useEffect(() => {
    if (!started || !quiz) return;
    if (timeLeft <= 0) {
      submitQuiz(true);
      return;
    }
    const timer = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(timer);
  }, [started, timeLeft, quiz, submitQuiz]);

  // Tab switch detection
  useEffect(() => {
    if (!started) return;
    const handler = () => {
      if (document.hidden) {
        tabSwitchRef.current += 1;
        setTabSwitches(tabSwitchRef.current);
        if (tabSwitchRef.current >= 3) {
          submitQuiz(true);
        } else {
          toast.warning(`Warning: Tab switch ${tabSwitchRef.current}/3. Quiz will auto-submit at 3.`);
        }
      }
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, [started, submitQuiz]);

  if (!quiz) return null;

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  if (!started) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container max-w-2xl py-12">
          <Card className="shadow-elevated">
            <CardHeader>
              <CardTitle className="text-2xl">{quiz.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">{quiz.description}</p>
              <div className="flex flex-wrap gap-3">
                <Badge variant="secondary"><Clock className="mr-1 h-3 w-3" />{quiz.timeLimit} minutes</Badge>
                <Badge variant="secondary">{quiz.questions.length} questions</Badge>
                <Badge variant="secondary">{quiz.marksPerQuestion} marks each</Badge>
                <Badge variant="secondary">Total: {quiz.questions.length * quiz.marksPerQuestion} marks</Badge>
              </div>
              <div className="rounded-lg border border-warning/30 bg-warning/5 p-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-5 w-5 text-warning" />
                  <div className="text-sm">
                    <p className="font-medium">Important Rules:</p>
                    <ul className="mt-1 list-inside list-disc text-muted-foreground">
                      <li>Do not switch tabs during the quiz</li>
                      <li>After 3 tab switches, the quiz will auto-submit</li>
                      <li>The quiz will also auto-submit when time runs out</li>
                      <li>Questions are randomized for each attempt</li>
                    </ul>
                  </div>
                </div>
              </div>
              <Button size="lg" className="w-full gradient-hero text-primary-foreground" onClick={() => setStarted(true)}>
                Start Quiz
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const q = quiz.questions[currentQ];

  return (
    <div className="min-h-screen bg-background">
      {/* Timer bar */}
      <div className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur-md">
        <div className="container flex h-14 items-center justify-between">
          <span className="font-heading font-semibold">{quiz.title}</span>
          <div className="flex items-center gap-4">
            {tabSwitches > 0 && (
              <Badge variant="destructive" className="text-xs">Warnings: {tabSwitches}/3</Badge>
            )}
            <Badge variant={timeLeft < 60 ? "destructive" : "secondary"} className="font-mono text-base px-3 py-1">
              <Clock className="mr-1 h-4 w-4" />{formatTime(timeLeft)}
            </Badge>
          </div>
        </div>
        {/* Progress bar */}
        <div className="h-1 bg-muted">
          <div className="h-full gradient-hero transition-all" style={{ width: `${((currentQ + 1) / quiz.questions.length) * 100}%` }} />
        </div>
      </div>

      <div className="container max-w-3xl py-8">
        {/* Question navigation dots */}
        <div className="mb-6 flex flex-wrap gap-2">
          {quiz.questions.map((qq, i) => (
            <button
              key={qq.id}
              onClick={() => setCurrentQ(i)}
              className={`h-8 w-8 rounded-full text-xs font-medium transition-colors ${
                i === currentQ
                  ? "gradient-hero text-primary-foreground"
                  : answers[qq.id] !== undefined
                  ? "bg-primary/20 text-primary"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>

        <Card className="shadow-card">
          <CardHeader>
            <p className="text-sm text-muted-foreground">Question {currentQ + 1} of {quiz.questions.length}</p>
            <CardTitle className="text-xl">{q.text}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {q.options.map((opt, i) => (
              <button
                key={i}
                onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: i }))}
                className={`w-full rounded-lg border p-4 text-left transition-all ${
                  answers[q.id] === i
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                    : "border-border hover:border-primary/30 hover:bg-muted/50"
                }`}
              >
                <span className="mr-3 inline-flex h-7 w-7 items-center justify-center rounded-full border text-sm font-medium">
                  {String.fromCharCode(65 + i)}
                </span>
                {opt}
              </button>
            ))}
          </CardContent>
        </Card>

        <div className="mt-6 flex items-center justify-between">
          <Button variant="outline" disabled={currentQ === 0} onClick={() => setCurrentQ(currentQ - 1)}>
            <ChevronLeft className="mr-1 h-4 w-4" /> Previous
          </Button>
          {currentQ < quiz.questions.length - 1 ? (
            <Button onClick={() => setCurrentQ(currentQ + 1)}>
              Next <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button className="gradient-hero text-primary-foreground" onClick={() => submitQuiz(false)}>
              Submit Quiz
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuizPage;
