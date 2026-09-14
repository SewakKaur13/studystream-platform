export interface Question {
  id?: string;
  _id?: string;

  text: string;
  questionText?: string;

  options: string[];

  correctAnswer: number; // zero-based option index

  questionCode?: string;
  codeLanguage?: string;

  imageFile?: File | null;
  imagePreview?: string | null;
  questionImage?: string | null;
}

export interface Quiz {
  _id: string;
  title: string;
  description: string;
  duration?: number;
  totalQuestions: number;
  attempts: number;
  status: "active" | "locked";
  createdAt: string;
}

export interface QuizDetail {
  _id?: string;
  title: string;
  description: string;
  duration: number;
  marksPerQuestion: number;

  questions: {
    id?: string;
    _id?: string;

    text: string;
    questionText?: string;

    questionCode?: string;
    codeLanguage?: string;

    options: string[];
    correctAnswer: number;

    questionImage?: string | null;
  }[];
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  quizTitle: string;
  studentId: string;

  answers: Record<string, number>; // questionId -> selected option index

  score: number;
  totalMarks: number;
  correctCount: number;
  wrongCount: number;
  percentage: number;
  completedAt: string;
  autoSubmitted?: boolean;
}

export interface Student {
  _id: string;
  name: string;
  enrollmentNumber: string;
}

export interface Admin {
  id: string;
  name: string;
  enrollmentNumber: string;
}

export interface QuizLock {
  quizId: string;
  studentId: string;
  lockedUntil: string; // ISO date
}