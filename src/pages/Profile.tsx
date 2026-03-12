import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { quizStore } from "@/stores/quizStore";
import { Student, QuizAttempt } from "@/types/quiz";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, BookOpen, Trophy, BarChart3 } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

const Profile = () => {
  const { user } = useAuth();
  const student = user as Student;
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);

  useEffect(() => {
    setAttempts(quizStore.getAttempts(student.id));
  }, [student.id]);

  const avgScore = attempts.length > 0
    ? Math.round(attempts.reduce((s, a) => s + a.percentage, 0) / attempts.length)
    : 0;

  const chartData = attempts.map((a, i) => ({
    attempt: i + 1,
    score: a.percentage,
    quiz: a.quizTitle,
  }));

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container max-w-4xl py-8">
        {/* Profile card */}
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
                <p className="text-2xl font-bold">{attempts.length}</p>
                <p className="text-xs text-muted-foreground">Quizzes</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{avgScore}%</p>
                <p className="text-xs text-muted-foreground">Avg Score</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Progress chart */}
        {chartData.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-primary" /> Progress Chart</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="attempt" label={{ value: "Attempt", position: "bottom" }} />
                    <YAxis domain={[0, 100]} label={{ value: "Score %", angle: -90, position: "insideLeft" }} />
                    <Tooltip
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                      formatter={(value: number) => [`${value}%`, "Score"]}
                      labelFormatter={(label) => `Attempt ${label}`}
                    />
                    <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: "hsl(var(--primary))" }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quiz History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Trophy className="h-5 w-5 text-warning" /> Quiz History</CardTitle>
          </CardHeader>
          <CardContent>
            {attempts.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No quizzes attempted yet.</p>
            ) : (
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
                    {[...attempts].reverse().map((a) => (
                      <tr key={a.id} className="border-t border-border">
                        <td className="p-3 font-medium">{a.quizTitle}</td>
                        <td className="p-3">{a.score}/{a.totalMarks}</td>
                        <td className="p-3 text-success">{a.correctCount}</td>
                        <td className="p-3 text-destructive">{a.wrongCount}</td>
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
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;
