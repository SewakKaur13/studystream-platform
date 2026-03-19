const express = require("express");
const router = express.Router();

const {
  createQuiz,
  getAllQuizzes,
  getQuizById,
  updateQuiz,
  deleteQuiz,
  // getQuizLockStatus
} = require("../controllers/quizController");
const{ verifyUser } = require("../middleware/authMiddleware");

router.post("/create-quiz", createQuiz);
router.get("/all-quizzes", getAllQuizzes);
router.get("/get-quiz/:id", getQuizById);
router.put("/update-quiz/:id", updateQuiz);
router.delete("/delete-quiz/:id", deleteQuiz);
// router.get("/quiz-lock-status/:id", verifyUser, getQuizLockStatus);

module.exports = router;