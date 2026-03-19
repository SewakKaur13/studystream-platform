const express = require("express");
const router = express.Router();

const {
    getDashboardStats,
    toggleQuizStatus,
    getQuizAnalytics
} = require("../controllers/adminDashboardController");
const verifyUser = require("../middleware/authMiddleware");

router.get("/dashboard-stats", getDashboardStats);
router.patch("/toggle-quiz-status/:quizId", verifyUser, toggleQuizStatus);
router.get("/quiz-analytics/:quizId", getQuizAnalytics);

module.exports = router;