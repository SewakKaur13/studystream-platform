import { Quiz, Student, Admin } from "@/types/quiz";

export const mockStudents: Student[] = [
  { id: "s1", name: "Rahul Sharma", enrollmentNumber: "EN2024001", password: "pass123" },
  { id: "s2", name: "Priya Patel", enrollmentNumber: "EN2024002", password: "pass123" },
  { id: "s3", name: "Amit Kumar", enrollmentNumber: "EN2024003", password: "pass123" },
];

export const mockAdmins: Admin[] = [
  { id: "a1", username: "admin", password: "admin123" },
];

export const mockQuizzes: Quiz[] = [
  {
    id: "q1",
    title: "JavaScript Fundamentals",
    description: "Test your knowledge of core JavaScript concepts including variables, functions, and scope.",
    timeLimit: 15,
    marksPerQuestion: 2,
    questions: [
      { id: "q1-1", text: "Which keyword declares a block-scoped variable?", options: ["var", "let", "both", "none"], correctAnswer: 1 },
      { id: "q1-2", text: "What does '===' check?", options: ["Value only", "Type only", "Value and type", "Reference"], correctAnswer: 2 },
      { id: "q1-3", text: "Which is NOT a primitive type?", options: ["string", "number", "object", "boolean"], correctAnswer: 2 },
      { id: "q1-4", text: "What does Array.map() return?", options: ["undefined", "A new array", "The same array", "A boolean"], correctAnswer: 1 },
      { id: "q1-5", text: "Which method adds to the end of an array?", options: ["push()", "pop()", "shift()", "unshift()"], correctAnswer: 0 },
    ],
    createdAt: "2024-01-15",
  },
  {
    id: "q2",
    title: "React Basics",
    description: "Evaluate your understanding of React components, hooks, and state management.",
    timeLimit: 20,
    marksPerQuestion: 3,
    questions: [
      { id: "q2-1", text: "What hook manages state in functional components?", options: ["useEffect", "useState", "useRef", "useMemo"], correctAnswer: 1 },
      { id: "q2-2", text: "JSX is syntactic sugar for?", options: ["HTML", "React.createElement()", "document.createElement()", "jQuery"], correctAnswer: 1 },
      { id: "q2-3", text: "What triggers a re-render?", options: ["Variable change", "State change", "Console.log", "Import"], correctAnswer: 1 },
      { id: "q2-4", text: "Which hook runs side effects?", options: ["useState", "useEffect", "useContext", "useReducer"], correctAnswer: 1 },
      { id: "q2-5", text: "Props are:", options: ["Mutable", "Read-only", "Global", "Optional only"], correctAnswer: 1 },
    ],
    createdAt: "2024-02-01",
  },
  {
    id: "q3",
    title: "CSS & Layout",
    description: "Challenge yourself with CSS layout techniques, flexbox, and grid.",
    timeLimit: 10,
    marksPerQuestion: 2,
    questions: [
      { id: "q3-1", text: "Which display value enables flexbox?", options: ["block", "inline", "flex", "grid"], correctAnswer: 2 },
      { id: "q3-2", text: "Which property sets flex direction?", options: ["flex-wrap", "flex-direction", "align-items", "justify-content"], correctAnswer: 1 },
      { id: "q3-3", text: "What unit is relative to viewport width?", options: ["px", "em", "vw", "rem"], correctAnswer: 2 },
      { id: "q3-4", text: "Which property creates grid columns?", options: ["grid-template-columns", "grid-column", "column-count", "grid-area"], correctAnswer: 0 },
    ],
    createdAt: "2024-03-01",
  },
];

export const motivationalQuotes = [
  { text: "The beautiful thing about learning is that nobody can take it away from you.", author: "B.B. King" },
  { text: "Education is the passport to the future, for tomorrow belongs to those who prepare for it today.", author: "Malcolm X" },
  { text: "The more that you read, the more things you will know. The more that you learn, the more places you'll go.", author: "Dr. Seuss" },
  { text: "Live as if you were to die tomorrow. Learn as if you were to live forever.", author: "Mahatma Gandhi" },
  { text: "An investment in knowledge pays the best interest.", author: "Benjamin Franklin" },
];
