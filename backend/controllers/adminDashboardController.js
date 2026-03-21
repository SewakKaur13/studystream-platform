const Quiz = require("../models/Quiz");
const User = require("../models/User");
const Attempt = require("../models/Attempt");
const mongoose = require("mongoose");

const getDashboardStats = async (req, res) => {
  try {
    const totalQuizzes = await Quiz.countDocuments();
    const totalStudents = await User.countDocuments({ role: "student" });
    const totalAttempts = await Attempt.countDocuments();

    // Get attempts with quiz questions
    const attempts = await Attempt.find().populate("quizId", "questions");

    let totalPercentage = 0;

    attempts.forEach((a) => {
      // ✅ Dynamic total questions
      const totalQuestions = a.quizId?.questions?.length || 1;

      const correct = a?.correctCount || 0;

      const percentage = (correct / totalQuestions) * 100;

      totalPercentage += percentage;
    });

    const avgScore =
      attempts.length > 0
        ? Number((totalPercentage / attempts.length).toFixed(2))
        : 0;

    res.json({
      totalQuizzes,
      totalStudents,
      totalAttempts,
      avgScore, // ✅ correct now
    });
  } catch (error) {
    console.error("Dashboard Error:", error);
    res.status(500).json({ message: error.message });
  }
};

const toggleQuizStatus = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.quizId);

    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found" });
    }

    quiz.status = quiz.status === "locked" ? "active" : "locked";

    await quiz.save();

    res.json({
      message: `Quiz is now ${quiz.status}`,
      status: quiz.status,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getQuizAnalytics = async (req, res) => {
  try {
    const { quizId } = req.params;

    // Validate quizId
    if (!mongoose.Types.ObjectId.isValid(quizId)) {
      return res.status(400).json({ message: "Invalid quiz ID" });
    }

    // Get quiz
    const quiz = await Quiz.findById(quizId).select("questions");

    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found" });
    }

    const totalQuestions = quiz.questions?.length || 1;

    // Get attempts
    const attempts = await Attempt.find({ quizId })
      .populate("studentId", "name enrollmentNumber");

    // Prepare analytics
    const analytics = attempts.map((a) => {
      let correct = a?.correctCount || 0;
      let wrong = a?.wrongCount || 0;

      const tabSwitchCount = a?.tabSwitchCount || 0;

      // Fix wrong count if auto-submitted due to tab switching
      if (tabSwitchCount >= 3) {
        const expectedWrong = totalQuestions - correct;

        if (wrong < expectedWrong) {
          wrong = expectedWrong;
        }
      }

      // Calculate percentage
      const percentage = ((correct / totalQuestions) * 100).toFixed(2);

      // Determine submit mode
      const submitMode = tabSwitchCount >= 3 ? "cheating" : "submitted";

      return {
        studentName: a.studentId?.name || "N/A",
        enrollmentNumber: a.studentId?.enrollmentNumber || "N/A",
        score: a?.score || correct,
        correct,
        wrong,
        percentage,
        date: a?.submittedAt,
        submitMode,
      };
    });

    // Sorting: highest correct first, then earliest submission
    analytics.sort((a, b) => {
      if (b.correct !== a.correct) {
        return b.correct - a.correct;
      }
      return new Date(a.date) - new Date(b.date);
    });

    res.json({
      totalAttempts: attempts.length,
      analytics,
    });

  } catch (error) {
    console.error("Analytics Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
module.exports = { getDashboardStats, toggleQuizStatus, getQuizAnalytics };
