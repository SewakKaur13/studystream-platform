import { useEffect, useState } from "react";
import { useParams, Link, useLocation } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  XCircle,
  Trophy,
  ArrowLeft,
  AlertTriangle,
  FileDown,
} from "lucide-react";
import { motion } from "framer-motion";
import api from "@/api/axios";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface ResultDetail {
  questionText: string;
  questionImage?: string;
  options: string[];
  selectedOption: number;
  correctAnswer: number;
  isCorrect: boolean;
}

interface QuizResult {
  obtainedMarks: number;
  totalMarks: number;
  correct: number;
  wrong: number;
  autoSubmitted?: boolean;
  resultDetails: ResultDetail[];
  quizTitle?: string;
  studentName?: string;
}

const ResultPage = () => {
  const { attemptId } = useParams<{ attemptId: string }>();
  const location = useLocation();
  const [result, setResult] = useState<QuizResult | null>(
    location.state?.result || null,
  );

  useEffect(() => {
    if (result) return;

    const fetchResult = async () => {
      try {
        const res = await api.get(`/student/result/${attemptId}`);
        setResult(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchResult();
  }, [attemptId, result]);

  if (!result)
    return (
      <div className="flex min-h-screen items-center justify-center">
        Loading...
      </div>
    );

  const percentage = Math.round(
    (result.obtainedMarks / result.totalMarks) * 100,
  );
  const grade =
    percentage >= 90
      ? "A+"
      : percentage >= 80
        ? "A"
        : percentage >= 70
          ? "B"
          : percentage >= 60
            ? "C"
            : percentage >= 40
              ? "D"
              : "F";
  const gradeColor =
    percentage >= 70
      ? "text-success"
      : percentage >= 40
        ? "text-warning"
        : "text-destructive";

  const downloadPDF = async () => {
    if (!attemptId) {
      console.error("Attempt ID is missing");
      return;
    }

    try {
      const response = await api.get(`/student/quiz-result-pdf/${attemptId}`, {
        responseType: "blob",
      });

      const blob = new Blob([response.data], {
        type: "application/pdf",
      });

      const pdfUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = pdfUrl;
      link.download = `${result.studentName?.trim().split(/\s+/)[0] || "Student"}_${
        result.quizTitle || "Quiz_Result"
      }.pdf`;

      document.body.appendChild(link);
      link.click();

      link.remove();
      window.URL.revokeObjectURL(pdfUrl);
    } catch (error) {
      console.error("PDF download failed:", error);
    }
  };

  return (
    <div id="result-pdf" className="min-h-screen bg-background">
      <Navbar />
      <div className="container max-w-3xl py-12 space-y-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
        >
          <Card className="shadow-elevated">
            <CardHeader className="text-center">
              {result.autoSubmitted && (
                <div className="mb-4 inline-flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive mx-auto">
                  <AlertTriangle className="h-4 w-4" /> Auto-submitted due to
                  tab switching
                </div>
              )}
              <div className="mb-4">
                <Trophy className={`mx-auto h-16 w-16 ${gradeColor}`} />
              </div>
              <CardTitle className="text-3xl">
                {result.quizTitle || "Quiz Result"}
              </CardTitle>
              <p className="text-muted-foreground">Quiz Results</p>
            </CardHeader>
            <CardContent>
              {/* Score circle */}
              <div className="mb-8 flex justify-center">
                <div
                  className={`flex h-32 w-32 flex-col items-center justify-center rounded-full border-4 ${
                    percentage >= 70
                      ? "border-success"
                      : percentage >= 40
                        ? "border-warning"
                        : "border-destructive"
                  }`}
                >
                  <span className={`text-4xl font-bold ${gradeColor}`}>
                    {percentage}%
                  </span>
                  <span className="text-sm text-muted-foreground">
                    Grade: {grade}
                  </span>
                </div>
              </div>

              {/* Stats grid */}
              <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="rounded-lg bg-muted p-4 text-center">
                  <p className="text-2xl font-bold">{result.obtainedMarks}</p>
                  <p className="text-xs text-muted-foreground">Score</p>
                </div>
                <div className="rounded-lg bg-muted p-4 text-center">
                  <p className="text-2xl font-bold">{result.totalMarks}</p>
                  <p className="text-xs text-muted-foreground">Total Marks</p>
                </div>
                <div className="rounded-lg bg-success/10 p-4 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <CheckCircle2 className="h-5 w-5 text-success" />
                    <p className="text-2xl font-bold text-success">
                      {result.correct}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">Correct</p>
                </div>
                <div className="rounded-lg bg-destructive/10 p-4 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <XCircle className="h-5 w-5 text-destructive" />
                    <p className="text-2xl font-bold text-destructive">
                      {result.wrong}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">Wrong</p>
                </div>
              </div>

              {/* Download PDF */}
              <div className="mb-8 flex justify-center">
                <Button
                  onClick={downloadPDF}
                  variant="outline"
                  className="w-full sm:w-auto"
                >
                  <FileDown className="mr-2 h-4 w-4" />
                  Download PDF
                </Button>
              </div>

              {/* Questions Review */}
              <div className="space-y-6"></div>

              {/* Questions Review */}
              <div className="space-y-6">
                {result.resultDetails.map((q, idx) => (
                  <Card key={idx} className="shadow-card">
                    <CardHeader>
                      <p className="text-sm text-muted-foreground">
                        Question {idx + 1}
                      </p>

                      {/*QUESTION TEXT WITH TABLE SUPPORT */}
                      <CardTitle className="text-lg space-y-3">
                        {/*QUESTION IMAGE */}
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
                        {(() => {
                          const rows = q.questionText.split(";");

                          const tableRows = rows.filter((r) => r.includes("|"));
                          const normalText = rows.filter(
                            (r) => !r.includes("|"),
                          );

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
                                    <thead>
                                      <tr className="bg-muted">
                                        {tableRows[0]
                                          .split("|")
                                          .map((col, i) => (
                                            <th
                                              key={i}
                                              className="border px-4 py-2 text-sm font-semibold text-center"
                                            >
                                              {col}
                                            </th>
                                          ))}
                                      </tr>
                                    </thead>

                                    <tbody>
                                      {tableRows.slice(1).map((row, i) => (
                                        <tr
                                          key={i}
                                          className="hover:bg-muted/50"
                                        >
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

                    <CardContent className="space-y-2">
                      {q.options.map((opt, i) => {
                        const isSelected = i === q.selectedOption;
                        const isCorrect = i === q.correctAnswer;

                        const correctStyle = isCorrect
                          ? "border-success bg-success/10"
                          : "";

                        const wrongStyle =
                          isSelected && !q.isCorrect
                            ? "border-destructive bg-destructive/10"
                            : "";

                        const selectedMarker = isSelected
                          ? q.isCorrect
                            ? "✓"
                            : "✕"
                          : "";

                        return (
                          <div
                            key={i}
                            className={`w-full rounded-lg border p-3 text-left flex items-center justify-between ${
                              correctStyle || wrongStyle || "border-border"
                            }`}
                          >
                            <span>
                              <span className="mr-2 font-bold">
                                {String.fromCharCode(65 + i)}.
                              </span>
                              {opt}
                            </span>

                            {isSelected && (
                              <span
                                className={`font-bold ${
                                  q.isCorrect
                                    ? "text-success"
                                    : "text-destructive"
                                }`}
                              >
                                {selectedMarker}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Navigation */}
              <div className="flex flex-col gap-3 sm:flex-row mt-6">
                <Link to="/dashboard" className="flex-1">
                  <Button variant="outline" className="w-full">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
                  </Button>
                </Link>
                <Link to="/profile" className="flex-1">
                  <Button className="w-full gradient-hero text-primary-foreground">
                    View Progress
                  </Button>
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
