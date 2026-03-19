const mongoose = require("mongoose");

const quizLockSchema = new mongoose.Schema({
  quizId: { type: mongoose.Schema.Types.ObjectId, ref: "Quiz", required: true },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Student",
    required: true,
  },
  lockedUntil: { type: Date, required: true },
});

module.exports = mongoose.model("QuizLock", quizLockSchema);
