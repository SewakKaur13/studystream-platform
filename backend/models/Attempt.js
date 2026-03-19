const mongoose = require("mongoose");

const attemptSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  quizId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Quiz",
    required: true,
  },

  answers: [
    {
      questionId: {
        type: mongoose.Schema.Types.ObjectId,
      },
      selectedOption: Number,
    },
  ],

  score: {
    type: Number,
    default: 0,
  },

  correctCount: {
    type: Number,
    default: 0,
  },

  wrongCount: {
    type: Number,
    default: 0,
  },

  tabSwitchCount: {
    type: Number,
    default: 0,
  },

  status: {
    type: String,
    enum: ["in-progress", "completed", "terminated"],
    default: "in-progress",
  },

  startedAt: {
    type: Date,
    default: Date.now,
  },

  submittedAt: {
    type: Date,
  },
});

module.exports = mongoose.model("Attempt", attemptSchema);
