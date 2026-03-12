import { useState, useEffect } from "react";
import { quizStore } from "@/stores/quizStore";
import { Quiz, QuizAttempt, Question } from "@/types/quiz";
import { mockStudents } from "@/data/mockData";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { BookOpen, Users, BarChart3, Plus, Edit2, Trash2, X } from "lucide-react";
import { toast } from "sonner";

const AdminPanel = () => {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [editQuiz, setEditQuiz] = useState<Quiz | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const reload = () => {
    setQuizzes(quizStore.getQuizzes());
    setAttempts(quizStore.getAttempts());
  };

  useEffect(reload, []);

  const uniqueStudents = new Set(attempts.map((a) => a.studentId)).size;
  const avgScore = attempts.length > 0
    ? Math.round(attempts.reduce((s, a) => s + a.percentage, 0) / attempts.length)
    : 0;

  const stats = [
    { icon: BookOpen, label: "Total Quizzes", value: quizzes.length },
    { icon: Users, label: "Total Students", value: mockStudents.length },
    { icon: Users, label: "Attempted", value: uniqueStudents },
    { icon: BarChart3, label: "Avg Score", value: `${avgScore}%` },
  ];

  const deleteQuiz = (id: string) => {
    quizStore.deleteQuiz(id);
    reload();
    toast.success("Quiz deleted");
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground">Manage quizzes and view analytics</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-accent text-accent-foreground" onClick={() => setEditQuiz(null)}>
                <Plus className="mr-2 h-4 w-4" /> Create Quiz
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editQuiz ? "Edit Quiz" : "Create Quiz"}</DialogTitle>
              </DialogHeader>
              <QuizForm
                quiz={editQuiz}
                onSave={(q) => {
                  if (editQuiz) quizStore.updateQuiz(q);
                  else quizStore.addQuiz(q);
                  reload();
                  setDialogOpen(false);
                  toast.success(editQuiz ? "Quiz updated" : "Quiz created");
                }}
              />
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => (
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
          {quizzes.map((quiz) => {
            const quizAttempts = attempts.filter((a) => a.quizId === quiz.id);
            return (
              <Card key={quiz.id}>
                <CardHeader>
                  <CardTitle className="text-lg">{quiz.title}</CardTitle>
                  <CardDescription>{quiz.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-4 flex flex-wrap gap-2 text-xs">
                    <Badge variant="secondary">{quiz.questions.length} questions</Badge>
                    <Badge variant="secondary">{quiz.timeLimit} min</Badge>
                    <Badge variant="secondary">{quizAttempts.length} attempts</Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setEditQuiz(quiz); setDialogOpen(true); }}
                    >
                      <Edit2 className="mr-1 h-3 w-3" /> Edit
                    </Button>
                    <Button variant="outline" size="sm" className="text-destructive" onClick={() => deleteQuiz(quiz.id)}>
                      <Trash2 className="mr-1 h-3 w-3" /> Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// Quiz Form Component
const QuizForm = ({ quiz, onSave }: { quiz: Quiz | null; onSave: (q: Quiz) => void }) => {
  const [title, setTitle] = useState(quiz?.title || "");
  const [description, setDescription] = useState(quiz?.description || "");
  const [timeLimit, setTimeLimit] = useState(quiz?.timeLimit || 15);
  const [marksPerQuestion, setMarksPerQuestion] = useState(quiz?.marksPerQuestion || 2);
  const [questions, setQuestions] = useState<Question[]>(
    quiz?.questions || [{ id: `q_${Date.now()}`, text: "", options: ["", "", "", ""], correctAnswer: 0 }]
  );

  const addQuestion = () => {
    setQuestions([...questions, { id: `q_${Date.now()}_${questions.length}`, text: "", options: ["", "", "", ""], correctAnswer: 0 }]);
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { toast.error("Title required"); return; }
    if (questions.some((q) => !q.text.trim() || q.options.some((o) => !o.trim()))) {
      toast.error("All questions and options must be filled"); return;
    }
    onSave({
      id: quiz?.id || `quiz_${Date.now()}`,
      title: title.trim(),
      description: description.trim(),
      timeLimit,
      marksPerQuestion,
      questions,
      createdAt: quiz?.createdAt || new Date().toISOString(),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Title</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Quiz title" />
      </div>
      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Quiz description" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Time Limit (min)</Label>
          <Input type="number" min={1} value={timeLimit} onChange={(e) => setTimeLimit(Number(e.target.value))} />
        </div>
        <div className="space-y-2">
          <Label>Marks per Question</Label>
          <Input type="number" min={1} value={marksPerQuestion} onChange={(e) => setMarksPerQuestion(Number(e.target.value))} />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-base font-semibold">Questions ({questions.length})</Label>
          <Button type="button" variant="outline" size="sm" onClick={addQuestion}>
            <Plus className="mr-1 h-3 w-3" /> Add
          </Button>
        </div>
        {questions.map((q, qi) => (
          <div key={q.id} className="rounded-lg border border-border p-4 space-y-3">
            <div className="flex items-start justify-between">
              <Label className="text-sm font-medium">Q{qi + 1}</Label>
              {questions.length > 1 && (
                <button type="button" onClick={() => removeQuestion(qi)} className="text-muted-foreground hover:text-destructive">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <Input
              value={q.text}
              onChange={(e) => updateQuestion(qi, "text", e.target.value)}
              placeholder="Question text"
            />
            {q.options.map((opt, oi) => (
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
            <p className="text-xs text-muted-foreground">Select the radio button next to the correct answer</p>
          </div>
        ))}
      </div>

      <Button type="submit" className="w-full gradient-accent text-accent-foreground">
        {quiz ? "Update Quiz" : "Create Quiz"}
      </Button>
    </form>
  );
};

export default AdminPanel;
