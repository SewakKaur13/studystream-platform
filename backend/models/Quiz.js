const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema({
  questionText: {
    type: String,
    required: true,
    trim: true,
  },

  questionImage: {
    type: String,
    default: null,
  },

  questionCode: {
    type: String,
    default: "",
  },

  codeLanguage: {
    type: String,
    default: "text",
    enum: [
      "text",
      "sql",
      "java",
      "javascript",
      "python",
      "cpp",
      "c",
      "dsa",
      "html",
      "css",
      "os",
    ],
  },

  options: {
    type: [String],
    validate: [
      (arr) => arr.length === 4,
      "Must provide exactly 4 options",
    ],
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