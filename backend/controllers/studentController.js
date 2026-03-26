const Quiz = require("../models/Quiz");
const Attempt = require("../models/Attempt");
const QuizLock = require("../models/QuizLock");

const getStudentDashboard = async (req, res) => {
  try {
    const studentId = req.userId;
    const now = new Date();

    const quizzes = await Quiz.find({ status: "active" }).sort({
      createdAt: -1,
    });

    // populate quiz to get questions
    const attempts = await Attempt.find({ studentId }).populate(
      "quizId",
      "questions",
    );

    const totalQuizzes = quizzes.length;
    const totalAttempted = attempts.length;

    let avgScore = 0;

    if (totalAttempted > 0) {
      let totalPercentage = 0;

      attempts.forEach((a) => {
        const totalQuestions = a.quizId?.questions?.length || 1;
        const correct = a?.correctCount || 0;

        const percentage = (correct / totalQuestions) * 100;

        totalPercentage += percentage;
      });

      avgScore = (totalPercentage / totalAttempted).toFixed(2);
    }

    // Lock logic (unchanged)
    const locks = await QuizLock.find({
      studentId,
      lockedUntil: { $gt: now },
    });

    const quizzesWithLockInfo = quizzes.map((quiz) => {
      const lock = locks.find(
        (l) => l.quizId.toString() === quiz._id.toString(),
      );

      return {
        _id: quiz._id,
        title: quiz.title,
        description: quiz.description,
        duration: quiz.duration,
        marksPerQuestion: quiz.marksPerQuestion,
        questions: quiz.questions,
        status: quiz.status,
        createdAt: quiz.createdAt,
        locked: !!lock,
        lockedUntil: lock ? lock.lockedUntil : null,
      };
    });

    res.json({
      totalQuizzes,
      totalAttempted,
      avgScore,
      quizzes: quizzesWithLockInfo,
      attempts,
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    res.status(500).json({ message: error.message });
  }
};

const startQuiz = async (req, res) => {
  try {
    const studentId = req.userId;
    const { quizId } = req.params;

    const quiz = await Quiz.findById(quizId);

    if (!quiz) {
      return res.status(404).json({
        message: "Quiz not found",
      });
    }

    if (quiz.status !== "active") {
      return res.status(403).json({
        message: "This quiz is currently locked by admin",
      });
    }

    //ADD THIS LOCK CHECK HERE
    const lock = await QuizLock.findOne({
      studentId,
      quizId,
      lockedUntil: { $gt: new Date() },
    });

    if (lock) {
      return res.status(403).json({
        message: `Quiz is locked until ${lock.lockedUntil}`,
        lockedUntil: lock.lockedUntil,
      });
    }

    // Check existing attempt
    let attempt = await Attempt.findOne({
      studentId,
      quizId,
      status: "in-progress",
    });

    // If no attempt → create new
    if (!attempt) {
      attempt = await Attempt.create({
        studentId,
        quizId,
        answers: [],
        status: "in-progress",
        tabSwitchCount: 0,
      });
    }

    // Shuffle ONLY once
    let questionsToSend;

    if (attempt.answers.length === 0) {
      questionsToSend = quiz.questions
        .sort(() => 0.5 - Math.random())
        ?.map((q) => ({
          _id: q._id,
          questionText: q.questionText,
          questionImage: q.questionImage || null,
          options: q.options,
        }));
    } else {
      questionsToSend = quiz.questions?.map((q) => ({
        _id: q._id,
        questionText: q.questionText,
        options: q.options,
        questionImage: q.questionImage || null,
      }));
    }
    res.json({
      attemptId: attempt._id,
      quizId: quiz._id,
      title: quiz.title,
      duration: quiz.duration || 45,
      marksPerQuestion: quiz.marksPerQuestion,
      questions: questionsToSend,
    });
  } catch (error) {
    console.error("Start quiz error:", error);
    res.status(500).json({
      message: error.message,
    });
  }
};

const saveAnswer = async (req, res) => {
  const { attemptId, questionId, selectedOption } = req.body;

  const attempt = await Attempt.findById(attemptId);

  if (!attempt) {
    return res.status(404).json({ message: "Attempt not found" });
  }

  const existing = attempt.answers.find(
    (a) => a.questionId.toString() === questionId,
  );

  if (existing) {
    existing.selectedOption = selectedOption;
  } else {
    attempt.answers.push({ questionId, selectedOption });
  }

  await attempt.save();

  res.json({ message: "Answer saved" });
};

const updateTabSwitch = async (req, res) => {
  const { attemptId } = req.body;

  const attempt = await Attempt.findById(attemptId);

  attempt.tabSwitchCount += 1;

  if (attempt.tabSwitchCount >= 3) {
    attempt.status = "terminated";
    attempt.submittedAt = new Date();

    await attempt.save();

    return res.json({
      autoSubmit: true,
    });
  }

  await attempt.save();

  res.json({
    tabSwitchCount: attempt.tabSwitchCount,
  });
};

const submitQuiz = async (req, res) => {
  const { attemptId, autoSubmitted } = req.body;

  const attempt = await Attempt.findById(attemptId);
  const quiz = await Quiz.findById(attempt.quizId);

  let score = 0;
  let correct = 0;
  let wrong = 0;

  const resultDetails = [];

  attempt.answers.forEach((ans) => {
    const question = quiz.questions.id(ans.questionId);

    const isCorrect = question.correctAnswer === ans.selectedOption;

    if (isCorrect) {
      score += quiz.marksPerQuestion;
      correct++;
    } else {
      wrong++;
    }

    resultDetails.push({
      questionText: question.questionText,
      options: question.options,
      selectedOption: ans.selectedOption,
      correctAnswer: question.correctAnswer,
      isCorrect,
    });
  });

  attempt.score = score;
  attempt.correctCount = correct;
  attempt.wrongCount = wrong;
  attempt.status = "completed";
  attempt.submittedAt = new Date();

  await attempt.save();

  // LOCK LOGIC
  const lockDurationAuto = 12 * 60 * 60 * 1000;
  const lockDurationManual = 24 * 60 * 60 * 1000;

  const lockDuration = autoSubmitted ? lockDurationAuto : lockDurationManual;

  await QuizLock.findOneAndUpdate(
    {
      studentId: attempt.studentId,
      quizId: attempt.quizId,
    },
    {
      lockedUntil: new Date(Date.now() + lockDuration),
    },
    { upsert: true },
  );

  res.json({
    obtainedMarks: score,
    totalMarks: quiz.questions.length * quiz.marksPerQuestion,
    correct,
    wrong,
    resultDetails,
  });
};

const getRecentAttempts = async (req, res) => {
  try {
    const studentId = req.userId;

    const attempts = await Attempt.find({
      studentId,
      status: "completed",
    })
      .populate("quizId", "title marksPerQuestion questions")
      .sort({ submittedAt: -1 })
      .limit(5);

    const recentAttempts = attempts.map((attempt) => {
      const totalQuestions = attempt.quizId.questions.length;
      const totalMarks = totalQuestions * attempt.quizId.marksPerQuestion;

      const percentage = ((attempt.score / totalMarks) * 100).toFixed(2);

      return {
        quizTitle: attempt.quizId.title,
        score: attempt.score,
        percentage: percentage + "%",
        date: attempt.submittedAt,
      };
    });

    res.json(recentAttempts);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const getStudentProgress = async (req, res) => {
  try {
    const studentId = req.userId;

    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    // Total attempts count
    const totalAttempts = await Attempt.countDocuments({
      studentId,
      status: "completed",
    });

    // Paginated attempts
    const attempts = await Attempt.find({
      studentId,
      status: "completed",
    })
      .populate("quizId", "title marksPerQuestion questions")
      .sort({ submittedAt: -1 })
      .skip(skip)
      .limit(limit);

    // History Data (Table)
    const history = attempts.map((a) => {
      const totalQuestions = a.quizId?.questions?.length || 0;
      const marksPerQuestion = a.quizId?.marksPerQuestion || 0;

      const totalMarks = totalQuestions * marksPerQuestion;
      const correctMarks = (a.correctCount || 0) * marksPerQuestion;

      const percentage = totalMarks
        ? ((correctMarks / totalMarks) * 100).toFixed(2)
        : "0.00";

      return {
        quizTitle: a.quizId?.title || "Quiz",
        score: `${correctMarks}/${totalMarks}`, // Correct format
        correct: a.correctCount || 0,
        wrong: a.wrongCount || 0,
        percentage,
        completedAt: a.submittedAt,
      };
    });

    // Chart Data (All attempts)
    const chartAttempts = await Attempt.find({
      studentId,
      status: "completed",
    })
      .populate("quizId", "title marksPerQuestion questions")
      .sort({ submittedAt: 1 });

    const chartData = chartAttempts.map((a, index) => {
      const totalQuestions = a.quizId?.questions?.length || 0;
      const marksPerQuestion = a.quizId?.marksPerQuestion || 0;

      const totalMarks = totalQuestions * marksPerQuestion;
      const correctMarks = (a.correctCount || 0) * marksPerQuestion;

      const percentage = totalMarks
        ? ((correctMarks / totalMarks) * 100).toFixed(2)
        : "0.00";

      return {
        attempt: index + 1,
        quizTitle: a.quizId?.title || "Quiz",
        score: Number(percentage), // for graph
      };
    });

    // Final Response
    res.json({
      chartData,
      history,
      pagination: {
        page,
        limit,
        totalAttempts,
        totalPages: Math.ceil(totalAttempts / limit),
      },
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const lockQuiz = async (req, res) => {
  try {
    const { quizId } = req.body;

    if (!quizId) {
      return res.status(400).json({ message: "Quiz ID is required" });
    }

    const studentId = req.userId;

    const lockDuration = 12 * 60 * 60 * 1000; // 12 hours
    const lockedUntil = new Date(Date.now() + lockDuration);

    const existing = await QuizLock.findOne({ quizId, studentId });

    if (existing) {
      existing.lockedUntil = lockedUntil;
      await existing.save();
    } else {
      await QuizLock.create({
        quizId,
        studentId,
        lockedUntil,
      });
    }

    res.status(200).json({
      message: "Quiz locked for 12 hours",
      lockedUntil,
    });
  } catch (err) {
    console.error("Lock quiz error:", err);
    res.status(500).json({ message: "Failed to lock quiz" });
  }
};
module.exports = {
  getStudentDashboard,
  startQuiz,
  saveAnswer,
  updateTabSwitch,
  submitQuiz,
  getRecentAttempts,
  getStudentProgress,
  lockQuiz,
};
