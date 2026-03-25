const express = require("express");
const router = express.Router();

const {
  createQuiz,
  getAllQuizzes,
  getQuizById,
  updateQuiz,
  deleteQuiz,
} = require("../controllers/quizController");
const upload =require("../config/multer");

router.post("/create-quiz",upload.any(), createQuiz);
router.get("/all-quizzes", getAllQuizzes);
router.get("/get-quiz/:id", getQuizById);
router.put("/update-quiz/:id",upload.any(), updateQuiz);
router.delete("/delete-quiz/:id", deleteQuiz);


module.exports = router;