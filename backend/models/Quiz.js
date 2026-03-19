const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema({
  questionText: {
    type: String,
    required: true,
  },
  options: {
    type: [String],
    validate: [(arr) => arr.length === 4, "Must provide exactly 4 options"],
  },
  correctAnswer: {
    type: Number,
    required: true,
  },
});

const quizSchema = new mongoose.Schema({
  title: String,
  description: String,
  duration: Number,
  marksPerQuestion: Number,
  questions: [questionSchema],
  status: {
    type: String,
    enum: ["locked", "active"],
    default: "locked",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Quiz", quizSchema);
