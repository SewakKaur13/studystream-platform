import { Quiz, QuizAttempt, QuizLock } from "@/types/quiz";
import { mockQuizzes } from "@/data/mockData";

const QUIZZES_KEY = "quizPlatform_quizzes";
const ATTEMPTS_KEY = "quizPlatform_attempts";
const LOCKS_KEY = "quizPlatform_locks";

function getItem<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function setItem(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

// Initialize quizzes if not present
if (!localStorage.getItem(QUIZZES_KEY)) {
  setItem(QUIZZES_KEY, mockQuizzes);
}

export const quizStore = {
  getQuizzes: (): Quiz[] => getItem(QUIZZES_KEY, mockQuizzes),

  getQuiz: (id: string): Quiz | undefined =>
    quizStore.getQuizzes().find((q) => q.id === id),

  addQuiz: (quiz: Quiz) => {
    const quizzes = quizStore.getQuizzes();
    quizzes.push(quiz);
    setItem(QUIZZES_KEY, quizzes);
  },

  updateQuiz: (quiz: Quiz) => {
    const quizzes = quizStore.getQuizzes().map((q) => (q.id === quiz.id ? quiz : q));
    setItem(QUIZZES_KEY, quizzes);
  },

  deleteQuiz: (id: string) => {
    const quizzes = quizStore.getQuizzes().filter((q) => q.id !== id);
    setItem(QUIZZES_KEY, quizzes);
  },

  // Attempts
  getAttempts: (studentId?: string): QuizAttempt[] => {
    const all = getItem<QuizAttempt[]>(ATTEMPTS_KEY, []);
    return studentId ? all.filter((a) => a.studentId === studentId) : all;
  },

  addAttempt: (attempt: QuizAttempt) => {
    const attempts = getItem<QuizAttempt[]>(ATTEMPTS_KEY, []);
    attempts.push(attempt);
    setItem(ATTEMPTS_KEY, attempts);
  },

  // Locks
  isLocked: (quizId: string, studentId: string): boolean => {
    const locks = getItem<QuizLock[]>(LOCKS_KEY, []);
    const lock = locks.find((l) => l.quizId === quizId && l.studentId === studentId);
    if (!lock) return false;
    return new Date(lock.lockedUntil) > new Date();
  },

  lockQuiz: (quizId: string, studentId: string, hours: number = 1) => {
    const locks = getItem<QuizLock[]>(LOCKS_KEY, []);
    const until = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
    const existing = locks.findIndex((l) => l.quizId === quizId && l.studentId === studentId);
    if (existing >= 0) {
      locks[existing].lockedUntil = until;
    } else {
      locks.push({ quizId, studentId, lockedUntil: until });
    }
    setItem(LOCKS_KEY, locks);
  },

  getLockExpiry: (quizId: string, studentId: string): string | null => {
    const locks = getItem<QuizLock[]>(LOCKS_KEY, []);
    const lock = locks.find((l) => l.quizId === quizId && l.studentId === studentId);
    if (!lock) return null;
    return new Date(lock.lockedUntil) > new Date() ? lock.lockedUntil : null;
  },

  // Shuffle questions for a student
  shuffleQuestions: (quiz: Quiz): Quiz => {
    const shuffled = [...quiz.questions].sort(() => Math.random() - 0.5);
    return { ...quiz, questions: shuffled };
  },
};
