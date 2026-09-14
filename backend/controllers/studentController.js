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

    let attempt = await Attempt.findOne({
      studentId,
      quizId,
      status: "in-progress",
    });

    if (!attempt) {
      attempt = await Attempt.create({
        studentId,
        quizId,
        answers: [],
        status: "in-progress",
        tabSwitchCount: 0,
      });
    }

    let questionsToSend;

    if (attempt.answers.length === 0) {
      const shuffledQuestions = [...quiz.questions].sort(
        () => 0.5 - Math.random(),
      );

      questionsToSend = shuffledQuestions.map((q) => ({
        _id: q._id,
        questionText: q.questionText || q.text || "",
        questionCode: q.questionCode || "",
        codeLanguage: q.codeLanguage || "text",
        questionImage: q.questionImage || null,
        options: q.options || [],
      }));
    } else {
      questionsToSend = quiz.questions.map((q) => ({
        _id: q._id,
        questionText: q.questionText || q.text || "",
        questionCode: q.questionCode || "",
        codeLanguage: q.codeLanguage || "text",
        questionImage: q.questionImage || null,
        options: q.options || [],
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
  try {
    const studentId = req.userId;
    const { attemptId, questionId, selectedOption } = req.body;

    if (
      !attemptId ||
      !questionId ||
      selectedOption === undefined ||
      selectedOption === null
    ) {
      return res.status(400).json({
        message: "attemptId, questionId and selectedOption are required",
      });
    }

    const attempt = await Attempt.findOne({
      _id: attemptId,
      studentId,
      status: "in-progress",
    });

    if (!attempt) {
      return res.status(404).json({
        message: "Active attempt not found",
      });
    }

    const quiz = await Quiz.findById(attempt.quizId);

    if (!quiz) {
      return res.status(404).json({
        message: "Quiz not found",
      });
    }

    const question = quiz.questions.id(questionId);

    if (!question) {
      return res.status(404).json({
        message: "Question not found",
      });
    }

    const selectedOptionNumber = Number(selectedOption);

    if (
      !Number.isInteger(selectedOptionNumber) ||
      selectedOptionNumber < 0 ||
      selectedOptionNumber >= question.options.length
    ) {
      return res.status(400).json({
        message: "Invalid option selected",
      });
    }

    const existing = attempt.answers.find(
      (answer) => answer.questionId.toString() === questionId.toString(),
    );

    if (existing) {
      existing.selectedOption = selectedOptionNumber;
    } else {
      attempt.answers.push({
        questionId,
        selectedOption: selectedOptionNumber,
      });
    }

    await attempt.save();

    res.json({
      message: "Answer saved",
    });
  } catch (error) {
    console.error("Save answer error:", error);

    res.status(500).json({
      message: error.message,
    });
  }
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
  try {
    const studentId = req.userId;
    const { attemptId, autoSubmitted = false } = req.body;

    const attempt = await Attempt.findOne({
      _id: attemptId,
      studentId,
      status: "in-progress",
    });

    if (!attempt) {
      return res.status(404).json({
        message: "Active attempt not found",
      });
    }

    const quiz = await Quiz.findById(attempt.quizId);

    if (!quiz) {
      return res.status(404).json({
        message: "Quiz not found",
      });
    }

    let score = 0;
    let correct = 0;
    let wrong = 0;

    const resultDetails = [];

    quiz.questions.forEach((question) => {
      const answer = attempt.answers.find(
        (item) =>
          item.questionId.toString() === question._id.toString(),
      );

      const selectedOption =
        answer && answer.selectedOption !== undefined
          ? Number(answer.selectedOption)
          : null;

      const correctAnswer = Number(question.correctAnswer);

      const isCorrect =
        selectedOption !== null &&
        selectedOption === correctAnswer;

      if (isCorrect) {
        score += quiz.marksPerQuestion;
        correct++;
      } else if (selectedOption !== null) {
        wrong++;
      }

      resultDetails.push({
        questionId: question._id,

        questionText:
          question.questionText ||
          question.text ||
          "",

        questionCode: question.questionCode || "",

        codeLanguage: question.codeLanguage || "text",

        questionImage: question.questionImage || null,

        options: question.options || [],

        selectedOption,

        selectedAnswer:
          selectedOption !== null &&
          selectedOption >= 0 &&
          selectedOption < question.options.length
            ? question.options[selectedOption]
            : "Not answered",

        correctAnswer,

        correctAnswerText:
          correctAnswer >= 0 &&
          correctAnswer < question.options.length
            ? question.options[correctAnswer]
            : "Not available",

        isCorrect,
      });
    });

    attempt.score = score;
    attempt.correctCount = correct;
    attempt.wrongCount = wrong;
    attempt.status = "completed";
    attempt.submittedAt = new Date();
    attempt.autoSubmitted = Boolean(autoSubmitted);

    await attempt.save();

    const lockDurationAuto = 12 * 60 * 60 * 1000;
    const lockDurationManual = 24 * 60 * 60 * 1000;

    const lockDuration = autoSubmitted
      ? lockDurationAuto
      : lockDurationManual;

    await QuizLock.findOneAndUpdate(
      {
        studentId: attempt.studentId,
        quizId: attempt.quizId,
      },
      {
        lockedUntil: new Date(Date.now() + lockDuration),
      },
      {
        upsert: true,
        new: true,
      },
    );

    const totalMarks =
      quiz.questions.length * quiz.marksPerQuestion;

    res.json({
      attemptId: attempt._id,
      quizId: quiz._id,
      quizTitle: quiz.title,

      obtainedMarks: score,
      totalMarks,

      correct,
      wrong,

      percentage: totalMarks
        ? ((score / totalMarks) * 100).toFixed(2)
        : "0.00",

      autoSubmitted: Boolean(autoSubmitted),

      resultDetails,
    });
  } catch (error) {
    console.error("Submit quiz error:", error);

    res.status(500).json({
      message: error.message,
    });
  }
};

const getQuizResult = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const studentId = req.userId;

    const attempt = await Attempt.findOne({
      _id: attemptId,
      studentId,
      status: "completed",
    });

    if (!attempt) {
      return res.status(404).json({
        message: "Completed attempt not found",
      });
    }

    const quiz = await Quiz.findById(attempt.quizId);

    if (!quiz) {
      return res.status(404).json({
        message: "Quiz not found",
      });
    }

    const resultDetails = attempt.answers.map((answer) => {
      const question = quiz.questions.id(answer.questionId);

      if (!question) {
        return null;
      }

      const selectedOptionIndex = Number(answer.selectedOption);
      const correctOptionIndex = Number(question.correctAnswer);

      const isCorrect =
        selectedOptionIndex === correctOptionIndex;

      return {
        questionId: question._id,

        questionText:
          question.questionText ||
          question.text ||
          "",

        questionCode: question.questionCode || "",

        codeLanguage: question.codeLanguage || "text",

        questionImage: question.questionImage || null,

        options: question.options || [],

        selectedOption: selectedOptionIndex,

        selectedAnswer:
          selectedOptionIndex >= 0 &&
          selectedOptionIndex < question.options.length
            ? question.options[selectedOptionIndex]
            : "Not answered",

        correctAnswer: correctOptionIndex,

        correctAnswerText:
          correctOptionIndex >= 0 &&
          correctOptionIndex < question.options.length
            ? question.options[correctOptionIndex]
            : "Not available",

        isCorrect,
      };
    }).filter(Boolean);

    const totalMarks =
      quiz.questions.length * quiz.marksPerQuestion;

    const obtainedMarks = attempt.score || 0;

    const percentage = totalMarks
      ? ((obtainedMarks / totalMarks) * 100).toFixed(2)
      : "0.00";

    res.json({
      attemptId: attempt._id,
      quizId: quiz._id,
      quizTitle: quiz.title,

      obtainedMarks,
      totalMarks,

      correct: attempt.correctCount || 0,
      wrong: attempt.wrongCount || 0,

      percentage,

      autoSubmitted: attempt.autoSubmitted || false,

      completedAt: attempt.submittedAt,

      resultDetails,
    });
  } catch (error) {
    console.error("Get quiz result error:", error);

    res.status(500).json({
      message: error.message,
    });
  }
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

const getResultPDFData = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const studentId = req.userId;

    const attempt = await Attempt.findOne({
      _id: attemptId,
      studentId,
      status: "completed",
    });

    if (!attempt) {
      return res.status(404).json({
        message: "Completed attempt not found",
      });
    }

    const quiz = await Quiz.findById(attempt.quizId);

    if (!quiz) {
      return res.status(404).json({
        message: "Quiz not found",
      });
    }

    const resultDetails = quiz.questions.map((question) => {
      const answer = attempt.answers.find(
        (item) =>
          item.questionId.toString() ===
          question._id.toString(),
      );

      const selectedOption = answer
        ? Number(answer.selectedOption)
        : -1;

      const correctAnswer = Number(question.correctAnswer);

      const selectedAnswer =
        selectedOption >= 0 &&
        selectedOption < question.options.length
          ? question.options[selectedOption]
          : "Not answered";

      const correctAnswerText =
        correctAnswer >= 0 &&
        correctAnswer < question.options.length
          ? question.options[correctAnswer]
          : "Not available";

      return {
        questionId: question._id,

        questionText:
          question.questionText ||
          question.text ||
          "",

        questionCode: question.questionCode || "",

        codeLanguage: question.codeLanguage || "text",

        questionImage: question.questionImage || null,

        options: question.options || [],

        selectedOption,

        selectedAnswer,

        correctAnswer,

        correctAnswerText,

        isCorrect:
          selectedOption !== -1 &&
          selectedOption === correctAnswer,
      };
    });

    const totalMarks =
      quiz.questions.length * quiz.marksPerQuestion;

    const obtainedMarks = attempt.score || 0;

    const percentage = totalMarks
      ? ((obtainedMarks / totalMarks) * 100).toFixed(2)
      : "0.00";

    res.json({
      attemptId: attempt._id,
      quizId: quiz._id,
      quizTitle: quiz.title,

      obtainedMarks,
      totalMarks,

      correct: attempt.correctCount || 0,
      wrong: attempt.wrongCount || 0,

      percentage,

      completedAt: attempt.submittedAt,

      resultDetails,
    });
  } catch (error) {
    console.error("Result PDF data error:", error);

    res.status(500).json({
      message: error.message,
    });
  }
};
module.exports = {
  getStudentDashboard,
  startQuiz,
  saveAnswer,
  updateTabSwitch,
  submitQuiz,
  getQuizResult,
  getRecentAttempts,
  getStudentProgress,
  lockQuiz,
  getResultPDFData,
};
