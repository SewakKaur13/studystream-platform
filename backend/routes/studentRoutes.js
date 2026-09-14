const express = require("express");
const router = express.Router();

const verifyUser = require("../middleware/authMiddleware");
const {
  getStudentDashboard,
  startQuiz,
  saveAnswer,
  updateTabSwitch,
  submitQuiz,
  getQuizResult,
  getRecentAttempts,
  getStudentProgress,
  lockQuiz,
  downloadQuizResultPDF
} = require("../controllers/studentController");

router.get("/dashboard", verifyUser, getStudentDashboard);
router.get("/start-quiz/:quizId", verifyUser, startQuiz);
router.post("/save-answer", verifyUser, saveAnswer);
router.post("/tab-switch", verifyUser, updateTabSwitch);
router.post("/submit-quiz", verifyUser, submitQuiz);
router.get("/result/:attemptId", verifyUser, getQuizResult);
router.get("/recent-attempts", verifyUser, getRecentAttempts);
router.get("/progress", verifyUser, getStudentProgress);
router.post("/lock-quiz", verifyUser, lockQuiz);
router.get("/quiz-result-pdf/:attemptId", verifyUser, downloadQuizResultPDF);

module.exports = router;
