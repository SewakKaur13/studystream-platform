import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Student, QuizAttempt } from "@/types/quiz";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Trophy, BarChart3 } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import api from "@/api/axios";

const Profile = () => {
  const { user } = useAuth();
  const student = user as Student;

  const [history, setHistory] = useState<QuizAttempt[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [avgScore, setAvgScore] = useState(0);

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const res = await api.get(`/student/progress?page=${page}`);
        console.log("API response:", res.data);

        // Map history data
        const mappedHistory: QuizAttempt[] = res.data.history.map((a: any, index: number) => {
          let scoreValue = 0;
          let totalMarksValue = 0;
          if (typeof a.score === "string" && a.score.includes("/")) {
            [scoreValue, totalMarksValue] = a.score.split("/").map(Number);
          } else if (typeof a.score === "number") {
            scoreValue = a.score;
            totalMarksValue = 0;
          }

          return {
            id: `${a.quizTitle}-${index}`,
            quizTitle: a.quizTitle,
            score: scoreValue || 0,
            totalMarks: totalMarksValue || 0,
            correctCount: a.correct ?? 0,
            wrongCount: a.wrong ?? 0,
            percentage: Number(a.percentage) || 0,
            completedAt: a.completedAt || null,
          };
        });
        setHistory(mappedHistory);

        // Map chart data
        const mappedChartData = res.data.chartData.map((c: any) => ({
          attempt: c.attempt,
          quizTitle: c.quizTitle,
          score: Number(c.score) || 0,
        }));
        setChartData(mappedChartData);

        setTotalPages(res.data.pagination.totalPages);

        if (mappedChartData.length > 0) {
          const avg =
            mappedChartData.reduce((s, a) => s + a.score, 0) / mappedChartData.length;
          setAvgScore(Math.round(avg));
        }
      } catch (error) {
        console.error("Failed to fetch progress:", error);
      }
    };

    fetchProgress();
  }, [page]);

  const handlePrev = () => setPage((prev) => Math.max(prev - 1, 1));
  const handleNext = () => setPage((prev) => Math.min(prev + 1, totalPages));

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container max-w-4xl py-8">
        {/* Profile Card */}
        <Card className="mb-8 shadow-elevated">
          <CardContent className="flex flex-col items-center gap-6 p-8 sm:flex-row">
            <div className="flex h-20 w-20 items-center justify-center rounded-full gradient-hero text-primary-foreground">
              <User className="h-10 w-10" />
            </div>
            <div className="text-center sm:text-left">
              <h1 className="text-2xl font-bold">{student.name}</h1>
              <p className="text-muted-foreground">{student.enrollmentNumber}</p>
            </div>
            <div className="flex gap-6 sm:ml-auto">
              <div className="text-center">
                <p className="text-2xl font-bold">{history.length}</p>
                <p className="text-xs text-muted-foreground">Quizzes</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{avgScore}%</p>
                <p className="text-xs text-muted-foreground">Avg Score</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Progress Chart */}
        {chartData?.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" /> Progress Chart
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="attempt" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip formatter={(value: number) => [`${value}%`, "Score"]} />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quiz History Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-warning" /> Quiz History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {history.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No quizzes attempted yet.
              </p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="p-3 text-left font-medium">Quiz</th>
                        <th className="p-3 text-left font-medium">Score</th>
                        <th className="p-3 text-left font-medium">Correct</th>
                        <th className="p-3 text-left font-medium">Wrong</th>
                        <th className="p-3 text-left font-medium">%</th>
                        <th className="p-3 text-left font-medium">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((a) => (
                        <tr key={a.id} className="border-t border-border">
                          <td className="p-3 font-medium">{a.quizTitle}</td>
                          <td className="p-3">{a.score}/{a.totalMarks}</td>
                          <td className="p-3 text-success">{a.correctCount}</td>
                          <td className="p-3 text-destructive">{a.wrongCount}</td>
                          <td className="p-3">
                            <Badge
                              variant={
                                a.percentage >= 70
                                  ? "default"
                                  : a.percentage >= 40
                                  ? "secondary"
                                  : "destructive"
                              }
                            >
                              {a.percentage}%
                            </Badge>
                          </td>
                          <td className="p-3 text-muted-foreground">
                            {a.completedAt
                              ? new Date(a.completedAt).toLocaleDateString()
                              : "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                <div className="flex justify-center gap-4 mt-4">
                  <button
                    onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                    disabled={page === 1}
                    className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
                  >
                    Prev
                  </button>
                  <span className="px-4 py-2">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={page === totalPages}
                    className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;