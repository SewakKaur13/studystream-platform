import { useState, useEffect } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Quiz, QuizAttempt, Question, QuizDetail } from "@/types/quiz";
import { MoreVertical, Lock, Unlock } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Navbar from "@/components/Navbar";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  BookOpen,
  Users,
  BarChart3,
  Plus,
  Edit2,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/api/axios";

const AdminPanel = () => {
  // Local state for quizzes and attempts
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);

  const [editQuiz, setEditQuiz] = useState<QuizDetail | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Delete quiz state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [quizToDelete, setQuizToDelete] = useState<string | null>(null);
  // Admin stats state
  const [dashboard, setDashboard] = useState({
    totalQuizzes: 0,
    totalStudents: 0,
    totalAttempts: 0,
    avgScore: 0,
  });
  // Analytics states
  const [analyticsModalOpen, setAnalyticsModalOpen] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<any[]>([]);
  const [analyticsQuizTitle, setAnalyticsQuizTitle] = useState("");

  const handleAnalytics = async (quizId: string, quizTitle: string) => {
    try {
      const res = await api.get(`/admin/quiz-analytics/${quizId}`);
      setAnalyticsData(res.data.analytics);
      setAnalyticsQuizTitle(quizTitle);
      setAnalyticsModalOpen(true);
    } catch (error) {
      console.error("Failed to fetch analytics", error);
    }
  };

  //Results PDF export
  const handleExportPDF = () => {
    const doc = new jsPDF();

    const fileName = `${analyticsQuizTitle}_Result.pdf`;

    // Title
    doc.setFontSize(14);
    doc.text(`${analyticsQuizTitle} - Results`, 14, 15);

    // Columns
    const tableColumn = ["Enrollment", "Name", "Score", "Percentage", "Mode"];

    // Rows
    const tableRows = analyticsData?.map((item) => [
      item.enrollmentNumber,
      item.studentName,
      item.score,
      `${item.percentage}%`,
      item.submitMode === "cheating" ? "Cheating" : "Submitted",
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 20,

      // background color for cheating rows
      didParseCell: function (data) {
        const rowIndex = data.row.index;
        const item = analyticsData[rowIndex];

        if (item?.submitMode === "cheating") {
          data.cell.styles.fillColor = [255, 230, 230];
        }
      },
    });

    doc.save(fileName);
  };

  const toDataURL = async (url: string): Promise<string> => {
    const response = await fetch(url);

    const blob = await response.blob();

    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onloadend = () => resolve(reader.result as string);

      reader.onerror = reject;

      reader.readAsDataURL(blob);
    });
  };
  // Quiz PDF export
  const exportQuizPDF = async (quiz: any) => {
    try {
      const pdf = new jsPDF("p", "mm", "a4");

      const pageWidth = pdf.internal.pageSize.getWidth();

      let y = 20;

      // ================= TITLE =================
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(22);

      pdf.text(quiz.title || "Quiz", pageWidth / 2, y, {
        align: "center",
      });

      y += 12;

      // ================= DESCRIPTION =================
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(12);

      const descriptionLines = pdf.splitTextToSize(quiz.description || "", 170);

      pdf.text(descriptionLines, pageWidth / 2, y, {
        align: "center",
      });

      y += descriptionLines.length * 6 + 10;

      // ================= QUESTIONS =================
      for (let qIndex = 0; qIndex < quiz.questions.length; qIndex++) {
        const question = quiz.questions[qIndex];

        // New page if needed
        if (y > 240) {
          pdf.addPage();
          y = 20;
        }

        // ================= QUESTION =================
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(14);

        const questionText = `${qIndex + 1}. ${question.text || ""}`;

        const questionLines = pdf.splitTextToSize(questionText, 180);

        pdf.text(questionLines, 15, y);

        y += questionLines.length * 7 + 4;

        // ================= IMAGE =================
        if (question.questionImage) {
          try {
            const imageUrl = `https://study-stream-api.onrender.com/${question.questionImage}`;

            const imageData = await toDataURL(imageUrl);

            pdf.addImage(imageData, "JPEG", 15, y, 80, 50);

            y += 58;
          } catch (error) {
            console.log("Image load failed", error);
          }
        }

        // ================= OPTIONS =================
        question.options.forEach((option: string, index: number) => {
          if (y > 260) {
            pdf.addPage();
            y = 20;
          }

          const isCorrect = index === question.correctAnswer;

          pdf.setFont("helvetica", isCorrect ? "bold" : "normal");

          pdf.setFontSize(12);

          const optionText = `${String.fromCharCode(65 + index)}. ${option}`;

          const optionLines = pdf.splitTextToSize(optionText, 170);

          pdf.text(optionLines, 25, y);

          y += optionLines.length * 6 + 2;
        });

        y += 8;
      }

      // ================= SAVE =================
      pdf.save(`${quiz.title}.pdf`);
    } catch (error) {
      console.log(error);
      toast.error("Failed to export PDF");
    }
  };

  //api call of dashboard stats
  const fetchDashboard = async () => {
    try {
      const res = await api.get("/admin/dashboard-stats");
      setDashboard(res.data);
    } catch (error) {
      console.error("Dashboard fetch failed", error);
      toast.error("Failed to load dashboard stats");
    }
  };
  useEffect(() => {
    fetchDashboard();
  }, []);
  const stats = [
    {
      icon: BookOpen,
      label: "Total Quizzes",
      value: dashboard?.totalQuizzes || 0,
    },
    {
      icon: Users,
      label: "Total Students",
      value: dashboard?.totalStudents || 0,
    },
    {
      icon: Users,
      label: "Attempted",
      value: dashboard?.totalAttempts || 0,
    },
    {
      icon: BarChart3,
      label: "Avg Score",
      value: `${dashboard?.avgScore}%`,
    },
  ];

  // Fetch quizzes on mount
  useEffect(() => {
    fetchQuizzes();
  }, []);

  const fetchQuizzes = async () => {
    try {
      const res = await api.get("/quiz/all-quizzes");

      setQuizzes(res.data);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to load quizzes");
    }
  };

  // Edit quiz handler
  const handleEditQuiz = async (id: string) => {
    try {
      const res = await api.get(`/quiz/get-quiz/${id}`);
      const data = res.data;

      const formatted = {
        _id: data._id,
        title: data.title,
        description: data.description,
        duration: data.duration,
        marksPerQuestion: data.marksPerQuestion,
        questions: data.questions?.map((q: any, idx: number) => ({
          id: q._id || `q_${idx}`, // generate id if not present
          text: q.questionText, // map questionText → text
          options: q.options,
          correctAnswer: q.correctAnswer,
          questionImage: q.questionImage || null,
        })),
        createdAt: data.createdAt,
      };

      setEditQuiz(formatted);
      setDialogOpen(true);
    } catch (err) {
      toast.error("Failed to load quiz");
      console.error(err);
    }
  };

  // Delete quiz handler
  const deleteQuiz = async (id: string) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this quiz? This action cannot be undone.",
    );

    if (!confirmDelete) return;

    try {
      await api.delete(`/quiz/delete-quiz/${id}`);
      toast.success("Quiz deleted successfully");
      fetchQuizzes();
      fetchDashboard();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to delete quiz");
    }
  };

  // Toggle quiz status handler
  const toggleQuizStatus = async (quizId: string) => {
    try {
      await api.patch(`/admin/toggle-quiz-status/${quizId}`);

      toast.success("Quiz status updated");

      fetchQuizzes();
      fetchDashboard();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to update status");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground">
              Manage quizzes and view analytics
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button
                className="gradient-accent text-accent-foreground"
                onClick={() => setEditQuiz(null)}
              >
                <Plus className="mr-2 h-4 w-4" /> Create Quiz
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editQuiz ? "Edit Quiz" : "Create Quiz"}
                </DialogTitle>
              </DialogHeader>
              <QuizForm
                quiz={editQuiz}
                onSave={async (formData) => {
                  try {
                    let res;

                    const quizData = JSON.parse(formData.get("data") as string);

                    if (editQuiz) {
                      res = await api.put(
                        `/quiz/update-quiz/${quizData._id}`,
                        formData,
                        {
                          headers: {
                            "Content-Type": "multipart/form-data",
                          },
                        },
                      );
                    } else {
                      res = await api.post("/quiz/create-quiz", formData, {
                        headers: {
                          "Content-Type": "multipart/form-data",
                        },
                      });
                    }

                    toast.success(res.data.message);

                    fetchQuizzes();
                    fetchDashboard();
                    setDialogOpen(false);
                  } catch (error: any) {
                    toast.error(
                      error?.response?.data?.message || "Something went wrong",
                    );
                  }
                }}
              />
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats?.map((s) => (
            <Card key={s.label}>
              <CardContent className="flex items-center gap-4 p-6">
                <div className="rounded-lg bg-accent/10 p-3">
                  <s.icon className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{s.value}</p>
                  <p className="text-sm text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quiz list */}
        <h2 className="mb-4 text-xl font-semibold">All Quizzes</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {quizzes?.map((quiz) => {
            const status = quiz?.status === "active" ? "active" : "locked";
            return (
              <Card
                key={quiz?._id}
                className={
                  status === "active"
                    ? "border-green-300 bg-green-50"
                    : "border-red-300 bg-red-50"
                }
              >
                <CardHeader className="flex flex-row items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{quiz.title}</CardTitle>
                    <CardDescription>{quiz.description}</CardDescription>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent align="end">
                      {status === "active" ? (
                        <DropdownMenuItem
                          onClick={() => toggleQuizStatus(quiz._id)}
                        >
                          <Lock className="mr-2 h-4 w-4" />
                          Lock Quiz
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem
                          onClick={() => toggleQuizStatus(quiz._id)}
                        >
                          <Unlock className="mr-2 h-4 w-4" />
                          Activate Quiz
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardHeader>

                <CardContent>
                  <div className="mb-4 flex flex-wrap gap-2 text-xs">
                    <Badge variant="secondary">
                      {quiz?.totalQuestions} questions
                    </Badge>

                    <Badge variant="secondary">{quiz?.duration || 0} min</Badge>

                    <Badge variant="secondary">{quiz?.attempts} attempts</Badge>

                    {/* Status Badge */}
                    <Badge
                      variant={status === "active" ? "default" : "destructive"}
                    >
                      {status === "active" ? "Active" : "Locked"}
                    </Badge>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditQuiz(quiz?._id)}
                    >
                      <Edit2 className="mr-1 h-3 w-3" /> Edit
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive"
                      onClick={() => {
                        setQuizToDelete(quiz._id);
                        setDeleteModalOpen(true);
                      }}
                    >
                      <Trash2 className="mr-1 h-3 w-3" /> Delete
                    </Button>

                    {/* Analytics Button */}
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleAnalytics(quiz._id, quiz.title)}
                    >
                      View Analytics
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => exportQuizPDF(quiz)}
                    >
                      Export Questions
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {/* ================= Delete Modal ================= */}
          {deleteModalOpen && quizToDelete && (
            <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
              <div className="bg-white rounded-lg shadow-lg p-6 w-96 space-y-4">
                <h2 className="text-lg font-semibold text-gray-800">
                  Confirm Delete
                </h2>
                <p className="text-sm text-gray-600 text-center">
                  Are you sure you want to delete this quiz? This action cannot
                  be undone.
                </p>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setDeleteModalOpen(false);
                      setQuizToDelete(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={async () => {
                      try {
                        await api.delete(`/quiz/delete-quiz/${quizToDelete}`);
                        toast.success("Quiz deleted successfully");
                        setDeleteModalOpen(false);
                        setQuizToDelete(null);
                        fetchQuizzes();
                      } catch (error: any) {
                        toast.error(
                          error?.response?.data?.message ||
                            "Failed to delete quiz",
                        );
                      }
                    }}
                  >
                    Yes, Delete
                  </Button>
                </div>
              </div>
            </div>
          )}
          {/* ========================================= */}
          {/* ================= Analytics Modal ================= */}
          {analyticsModalOpen && (
            <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 p-4">
              {/* Modal Box */}
              <div className="bg-white rounded-lg shadow-lg w-full max-w-5xl h-[85vh] flex flex-col relative">
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b">
                  <h2 className="text-lg font-semibold">
                    {analyticsQuizTitle} - Analytics
                  </h2>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleExportPDF}
                      className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Export PDF
                    </button>

                    <button
                      onClick={() => setAnalyticsModalOpen(false)}
                      className="text-gray-500 hover:text-gray-800 font-bold text-xl"
                    >
                      ×
                    </button>
                  </div>
                </div>

                {/* Table Container */}
                <div className="flex-1 overflow-y-auto p-4">
                  {/* Horizontal Scroll */}
                  <div className="overflow-x-auto">
                    <table className="min-w-[1000px] w-full border border-gray-200">
                      {/* Sticky Header */}
                      <thead className="bg-gray-100 sticky top-0 z-10">
                        <tr>
                          <th className="px-4 py-2 text-left text-sm font-medium min-w-[140px]">
                            Enrollment
                          </th>
                          <th className="px-4 py-2 text-left text-sm font-medium min-w-[160px]">
                            Name
                          </th>
                          <th className="px-4 py-2 text-left text-sm font-medium min-w-[80px]">
                            Score
                          </th>
                          <th className="px-4 py-2 text-left text-sm font-medium min-w-[120px]">
                            Percentage
                          </th>
                          <th className="px-4 py-2 text-left text-sm font-medium min-w-[80px]">
                            Correct
                          </th>
                          <th className="px-4 py-2 text-left text-sm font-medium min-w-[80px]">
                            Wrong
                          </th>
                          <th className="px-4 py-2 text-left text-sm font-medium min-w-[120px]">
                            Mode
                          </th>
                          <th className="px-4 py-2 text-left text-sm font-medium min-w-[180px]">
                            Date
                          </th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-gray-200">
                        {analyticsData?.map((item, index) => (
                          <tr
                            key={index}
                            className={
                              item.submitMode === "cheating" ? "bg-red-50" : ""
                            }
                          >
                            <td className="px-4 py-2 text-sm">
                              {item.enrollmentNumber}
                            </td>
                            <td className="px-4 py-2 text-sm">
                              {item.studentName}
                            </td>
                            <td className="px-4 py-2 text-sm">{item.score}</td>
                            <td className="px-4 py-2 text-sm">
                              {item.percentage}%
                            </td>
                            <td className="px-4 py-2 text-sm">
                              {item.correct}
                            </td>
                            <td className="px-4 py-2 text-sm">{item.wrong}</td>
                            <td className="px-4 py-2 text-sm">
                              {item.submitMode === "cheating" ? (
                                <span className="text-red-600 font-medium">
                                  ⚠️ Cheating
                                </span>
                              ) : (
                                <span className="text-green-600 font-medium">
                                  ✅ Submitted
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-2 text-sm">
                              {new Date(item.date).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
          {/* ========================================= */}
        </div>
      </div>
    </div>
  );
};

// Quiz Form Component
const QuizForm = ({
  quiz,
  onSave,
}: {
  quiz: QuizDetail | null;
  onSave: (formData: FormData) => void;
}) => {
  const [title, setTitle] = useState(quiz?.title || "");
  const [description, setDescription] = useState(quiz?.description || "");
  const [timeLimit, setTimeLimit] = useState(quiz?.duration || 15);
  const [loading, setLoading] = useState(false);
  const [marksPerQuestion, setMarksPerQuestion] = useState(
    quiz?.marksPerQuestion || 2,
  );
  const [questions, setQuestions] = useState<Question[]>(
    quiz?.questions
      ? quiz.questions.map((q: any) => ({
          ...q,
          text: q.questionText || "",
          imageFile: null,
          imagePreview: null,
        }))
      : [
          {
            id: `q_${Date.now()}`,
            text: "",
            options: ["", "", "", ""],
            correctAnswer: 0,
            imageFile: null,
            imagePreview: null,
            questionImage: null,
          },
        ],
  );

  useEffect(() => {
    if (quiz) {
      setTitle(quiz.title || "");
      setDescription(quiz.description || "");
      setTimeLimit(quiz.duration || 15);
      setMarksPerQuestion(quiz.marksPerQuestion || 2);

      setQuestions(
        quiz.questions?.map((q: any) => ({
          ...q,
          text: q.text || q.questionText || "",

          // IMPORTANT FIX FOR IMAGE
          questionImage: q.questionImage || null,

          imageFile: null,
          imagePreview: null,
        })) || [],
      );
    }
  }, [quiz]);
  console.log("quiz:", quiz);
  console.log("questions state:", questions);
  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        id: `q_${Date.now()}_${questions.length}`,
        text: "",
        options: ["", "", "", ""],
        correctAnswer: 0,
        imageFile: null,
        imagePreview: null,
        questionImage: null,
      },
    ]);
  };

  const updateQuestion = (idx: number, field: string, value: any) => {
    const updated = [...questions];
    (updated[idx] as any)[field] = value;
    setQuestions(updated);
  };

  const updateOption = (qIdx: number, oIdx: number, value: string) => {
    const updated = [...questions];
    updated[qIdx].options[oIdx] = value;
    setQuestions(updated);
  };

  const removeQuestion = (idx: number) => {
    if (questions.length <= 1) return;
    setQuestions(questions.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Title required");
      return;
    }

    if (
      questions.some(
        (q) =>
          (!q.text.trim() && !q.imageFile && !q.questionImage) ||
          q.options.some((o) => !o.trim()),
      )
    ) {
      toast.error(
        "Each question must have text or image and all options filled",
      );
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();

      // JSON data (without files)
      const quizPayload = {
        _id: quiz?._id,
        title: title.trim(),
        description: description.trim(),
        duration: timeLimit,
        marksPerQuestion,
        questions: questions.map((q) => ({
          text: q.text,
          options: q.options,
          correctAnswer: q.correctAnswer,
          questionImage: q.questionImage || null, // existing image
        })),
      };

      formData.append("data", JSON.stringify(quizPayload));

      //Attach images separately
      questions.forEach((q, index) => {
        if (q.imageFile) {
          formData.append(`questionImage-${index}`, q.imageFile);
        }
      });

      await onSave(formData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    idx: number,
  ) => {
    const file = e.target.files?.[0];

    if (!file) return;

    const updated = [...questions];

    updated[idx].imageFile = file;
    updated[idx].imagePreview = URL.createObjectURL(file);

    setQuestions(updated);
  };

  const removeImage = (idx: number) => {
    const updated = [...questions];

    updated[idx].imageFile = null;
    updated[idx].imagePreview = null;
    updated[idx].questionImage = null;

    setQuestions(updated);
  };
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Title</Label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Quiz title"
        />
      </div>
      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Quiz description"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Time Limit (min)</Label>
          <Input
            type="number"
            min={1}
            value={timeLimit}
            onChange={(e) => setTimeLimit(Number(e.target.value))}
          />
        </div>
        <div className="space-y-2">
          <Label>Marks per Question</Label>
          <Input
            type="number"
            min={1}
            value={marksPerQuestion}
            onChange={(e) => setMarksPerQuestion(Number(e.target.value))}
          />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-base font-semibold">
            Questions ({questions.length})
          </Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addQuestion}
          >
            <Plus className="mr-1 h-3 w-3" /> Add
          </Button>
        </div>
        {questions?.map((q, qi) => (
          <div
            key={q._id || q.id}
            className="rounded-lg border border-border p-4 space-y-3"
          >
            {/* Header */}
            <div className="flex items-start justify-between">
              <Label className="text-sm font-medium">Q{qi + 1}</Label>
              {questions.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeQuestion(qi)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Question Text */}
            <Input
              value={q.text}
              onChange={(e) => updateQuestion(qi, "text", e.target.value)}
              placeholder="Question text (use | for columns and ; for rows if table needed)"
            />

            {/* IMAGE UPLOAD SECTION */}
            <div className="space-y-2">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleImageChange(e, qi)}
              />

              {(q.imagePreview || q.questionImage) && (
                <div className="relative w-fit">
                  <img
                    src={
                      q.imagePreview
                        ? q.imagePreview
                        : q.questionImage
                          ? `https://study-stream-api.onrender.com/${q.questionImage}`
                          : ""
                    }
                    alt="question"
                    className="w-40 h-auto rounded border"
                  />

                  {/* Remove Image */}
                  <button
                    type="button"
                    onClick={() => removeImage(qi)}
                    className="absolute top-0 right-0 bg-white rounded-full p-1 shadow"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>

            {/* Options */}
            {q.options?.map((opt, oi) => (
              <div key={oi} className="flex items-center gap-2">
                <input
                  type="radio"
                  name={`correct_${qi}`}
                  checked={q.correctAnswer === oi}
                  onChange={() => updateQuestion(qi, "correctAnswer", oi)}
                  className="accent-primary"
                />
                <Input
                  value={opt}
                  onChange={(e) => updateOption(qi, oi, e.target.value)}
                  placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                  className="flex-1"
                />
              </div>
            ))}

            <p className="text-xs text-muted-foreground">
              Select the radio button next to the correct answer
            </p>
          </div>
        ))}
      </div>

      <Button
        type="submit"
        disabled={loading}
        className="w-full gradient-accent text-accent-foreground"
      >
        {loading
          ? quiz
            ? "Updating..."
            : "Creating..."
          : quiz
            ? "Update Quiz"
            : "Create Quiz"}
      </Button>
    </form>
  );
};

export default AdminPanel;
