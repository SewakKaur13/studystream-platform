import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Quiz, Student, Question } from "@/types/quiz";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";
import api from "@/api/axios";
import { toast } from "sonner";

const QuizPage = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const student = user as Student;
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState<
    (Quiz & { questions: Question[]; marksPerQuestion: number }) | null
  >(null);
  const [attemptId, setAttemptId] = useState<string>("");
  const [started, setStarted] = useState(false);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [tabSwitches, setTabSwitches] = useState(0);
  const tabSwitchRef = useRef(0);
  const submittedRef = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [starting, setStarting] = useState(false);
  const [visited, setVisited] = useState<Record<string, boolean>>({});

  /** Fetch quiz on mount (for Rules page) */
  useEffect(() => {
    if (!id) return;

    const fetchQuiz = async () => {
      try {
        const res = await api.get(`/student/start-quiz/${id}`);
        const data = res.data;
        // Safety check
        if (!data || !data.questions) {
          toast.error("Invalid quiz data received");
          navigate("/dashboard");
          return;
        }

        setAttemptId(data.attemptId);

        setQuiz({
          _id: data.quizId,
          title: data.title,
          marksPerQuestion: data.marksPerQuestion,
          description: data.description || "",
          questions: (data.questions || [])?.map((q: any) => ({
            id: q._id,
            text: q.questionText,
            options: q.options,
            correctAnswer: 0,
            questionImage: q.questionImage || null,
          })),
          totalQuestions: data.questions.length,
          attempts: 0,
          createdAt: new Date().toISOString(),
          status: "active",
        });


        // FIXED TIMER
        setTimeLeft((data.duration || 15) * 60);
      } catch (err: any) {
        console.error(err);
        toast.error(err?.response?.data?.message || "Failed to load quiz");
        navigate("/dashboard");
      }
    };

    fetchQuiz();
  }, [id, navigate]);

  /** Save Answer */
  const saveAnswer = async (questionId: string, optionIndex: number) => {
    if (!attemptId) return;
    try {
      await api.post("/student/save-answer", {
        attemptId,
        questionId,
        selectedOption: optionIndex,
      });
    } catch (err: any) {
      toast.error("Failed to save answer");
    }
  };

  /** Submit Quiz */
  const submitQuiz = useCallback(
    async (auto = false) => {
      if (submittedRef.current || !quiz || !attemptId) return;

      submittedRef.current = true;
      setIsSubmitting(true);

      try {
        const res = await api.post("/student/submit-quiz", {
          attemptId,
          answers,
          autoSubmitted: auto,
        });

        toast.success(
          auto ? "Quiz auto-submitted!" : "Quiz submitted successfully",
        );

        navigate(`/result/${attemptId}`, { state: { result: res.data } });
      } catch (err: any) {
        toast.error("Failed to submit quiz");
        submittedRef.current = false;
        setIsSubmitting(false);
      }
    },
    [quiz, answers, attemptId, navigate],
  );

  /** Timer */
  useEffect(() => {
    if (!started || !quiz) return;
    if (timeLeft <= 0) {
      submitQuiz(true);
      return;
    }
    const timer = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(timer);
  }, [started, timeLeft, quiz, submitQuiz]);

  /** Enable fullscreen when quiz starts */
  useEffect(() => {
    if (started) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  }, [started]);

  /** Tab switch / focus loss detection */
  useEffect(() => {
    if (!started || !attemptId || !quiz) return;

    const handleViolation = async () => {
      tabSwitchRef.current += 1;
      setTabSwitches(tabSwitchRef.current);

      try {
        // inform backend that tab switch happened
        await api.post("/student/tab-switch", { attemptId });
      } catch (err) {
        console.error("Tab switch API failed", err);
      }

      // If student switches tabs 3 times
      if (tabSwitchRef.current >= 3) {
        try {
          // call backend to lock quiz for 12 hours
          await api.post("/student/lock-quiz", {
            quizId: quiz._id,
          });

          toast.error(
            "You switched tabs 3 times. Quiz locked for 2 hours and auto-submitted.",
          );
        } catch (err) {
          console.error("Failed to lock quiz", err);
        }

        // auto submit quiz
        submitQuiz(true);
      } else {
        toast.warning(
          `Warning: Tab switch ${tabSwitchRef.current}/3. Quiz will auto-submit at 3.`,
        );
      }
    };

    /** Detect tab change */
    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleViolation();
      }
    };

    /** Detect window losing focus */
    const handleBlur = () => {
      handleViolation();
    };

    /** Detect exiting fullscreen */
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        handleViolation();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [started, attemptId, quiz, submitQuiz]);
  /** Track visited questions */
  useEffect(() => {
    if (!quiz || !started) return;

    const qId = quiz.questions[currentQ]?.id;

    if (qId) {
      setVisited((prev) => ({
        ...prev,
        [qId]: true,
      }));
    }
  }, [currentQ, quiz, started]);
  /** Loading state */
  if (!quiz) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container max-w-2xl py-12">
          <Card className="shadow-elevated">
            <CardHeader>
              <CardTitle className="text-2xl">Loading Quiz...</CardTitle>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  /** Rules page */
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
              <div className="rounded-lg border border-warning/30 bg-warning/5 p-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-5 w-5 text-warning" />
                  <div className="text-sm">
                    <p className="font-medium">Important Rules:</p>
                    <ul className="mt-1 list-inside list-disc text-muted-foreground">
                      <li>Do not switch tabs during the quiz</li>
                      <li>After 3 tab switches, the quiz will auto-submit</li>
                      <li>The quiz will auto-submit when time runs out</li>
                      <li>Questions are randomized for each attempt</li>
                    </ul>
                  </div>
                </div>
              </div>
              <Button
                size="lg"
                disabled={starting}
                className="w-full gradient-hero text-primary-foreground"
                onClick={() => {
                  setStarting(true);
                  setStarted(true);
                }}
              >
                {starting ? "Starting..." : "Start Quiz"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  /** Current question */
  const q = quiz.questions[currentQ];
  console.log("FULL QUIZ DATA:", quiz);
console.log("CURRENT QUESTION:", q);

  /** Format timer */
  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  /** Quiz page */
  return (
    <div className="min-h-screen bg-background">
      {/* Timer & Progress */}
      <div className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur-md">
        <div className="container flex h-14 items-center justify-between">
          <span className="font-heading font-semibold">{quiz.title}</span>
          <div className="flex items-center gap-4">
            {tabSwitches > 0 && (
              <Badge variant="destructive" className="text-xs">
                Warnings: {tabSwitches}/3
              </Badge>
            )}
            <Badge
              variant={timeLeft < 60 ? "destructive" : "secondary"}
              className="font-mono text-base px-3 py-1"
            >
              <Clock className="mr-1 h-4 w-4" /> {formatTime(timeLeft)}
            </Badge>
          </div>
        </div>
        <div className="h-1 bg-muted">
          <div
            className="h-full gradient-hero transition-all"
            style={{
              width: `${((currentQ + 1) / quiz.questions.length) * 100}%`,
            }}
          />
        </div>
      </div>

      <div className="container max-w-3xl py-8">
        <div className="mb-6">
          <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2">
            {quiz.questions?.map((question, index) => {
              const isAnswered = answers[question.id] !== undefined;
              const isVisited = visited[question.id];

              let bgColor = "bg-gray-200"; // not visited

              if (isAnswered) {
                bgColor = "bg-green-500 text-white";
              } else if (isVisited) {
                bgColor = "bg-red-500 text-white";
              }

              return (
                <button
                  key={question.id}
                  onClick={() => setCurrentQ(index)}
                  className={`w-10 h-10 rounded-md text-sm font-medium flex items-center justify-center ${bgColor} ${
                    currentQ === index ? "ring-2 ring-primary" : ""
                  }`}
                >
                  {index + 1}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 bg-green-500 rounded"></span>
              Answered
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 bg-red-500 rounded"></span>
              Visited
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 bg-gray-300 rounded"></span>
              Not Visited
            </div>
          </div>
        </div>
        {/* Question */}
        <Card className="shadow-card">
          <CardHeader>
            <p className="text-sm text-muted-foreground">
              Question {currentQ + 1} of {quiz.questions.length}
            </p>

            <CardTitle className="text-xl space-y-4">
              {/* QUESTION IMAGE */}
              {q.questionImage && (
                <div className="w-full flex justify-center">
                  <img
                    src={`https://study-stream-api.onrender.com/${q.questionImage}`}
                    alt="question"
                    className="w-full max-h-[400px] object-contain rounded-lg border shadow cursor-pointer"
                    onClick={() =>
                      window.open(
                        `https://study-stream-api.onrender.com/${q.questionImage}`,
                        "_blank",
                      )
                    }
                  />
                </div>
              )}

              {/* QUESTION TEXT + TABLE */}
              {(() => {
                const rows = (q.text || "").split(";");

                const tableRows = rows.filter((r) => r.includes("|"));
                const normalText = rows.filter((r) => !r.includes("|"));

                return (
                  <>
                    {/* Normal Text */}
                    {normalText?.map((text, i) => (
                      <p key={i} className="font-medium">
                        {text}
                      </p>
                    ))}

                    {/* TABLE */}
                    {tableRows.length > 0 && (
                      <div className="overflow-x-auto custom-scrollbar border rounded-lg">
                        <table className="min-w-[700px] w-full border-collapse">
                          {/* Header */}
                          <thead>
                            <tr className="bg-muted">
                              {tableRows[0].split("|").map((col, i) => (
                                <th
                                  key={i}
                                  className="border px-4 py-2 text-sm font-semibold text-center"
                                >
                                  {col}
                                </th>
                              ))}
                            </tr>
                          </thead>

                          {/* Body */}
                          <tbody>
                            {tableRows.slice(1).map((row, i) => (
                              <tr key={i} className="hover:bg-muted/50">
                                {row.split("|").map((col, j) => (
                                  <td
                                    key={j}
                                    className="border px-4 py-2 text-sm text-center"
                                  >
                                    {col}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                );
              })()}
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-3">
            {q.options?.map((opt, i) => (
              <button
                key={i}
                onClick={() => {
                  setAnswers((prev) => ({ ...prev, [q.id]: i }));
                  saveAnswer(q.id, i);
                }}
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
            
        {/* Navigation */}
        <div className="mt-6 flex items-center justify-between">
          <Button
            variant="outline"
            disabled={currentQ === 0}
            onClick={() => setCurrentQ(currentQ - 1)}
          >
            <ChevronLeft className="mr-1 h-4 w-4" /> Previous
          </Button>
          {currentQ < quiz.questions.length - 1 ? (
            <Button onClick={() => setCurrentQ(currentQ + 1)}>
              Next <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button
              className="gradient-hero text-primary-foreground"
              onClick={() => submitQuiz(false)}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Submitting..." : "Submit Quiz"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuizPage;
