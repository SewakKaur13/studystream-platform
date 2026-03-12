export interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswer: number; // index
}

export interface Quiz {
  id: string;
  title: string;
  description: string;
  timeLimit: number; // minutes
  marksPerQuestion: number;
  questions: Question[];
  createdAt: string;
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
  id: string;
  name: string;
  enrollmentNumber: string;
  password: string;
}

export interface Admin {
  id: string;
  username: string;
  password: string;
}

export interface QuizLock {
  quizId: string;
  studentId: string;
  lockedUntil: string; // ISO date
}
