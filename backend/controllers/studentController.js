const Quiz = require("../models/Quiz");
const Attempt = require("../models/Attempt");
const QuizLock = require("../models/QuizLock");
const PDFDocument = require("pdfkit");

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
  try {
    const { attemptId } = req.body;
    const studentId = req.userId;

    if (!attemptId) {
      return res.status(400).json({
        message: "Attempt ID is required",
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

    attempt.tabSwitchCount += 1;

    await attempt.save();

    res.json({
      tabSwitchCount: attempt.tabSwitchCount,
      autoSubmit: attempt.tabSwitchCount >= 3,
    });
  } catch (error) {
    console.error("Tab switch error:", error);

    res.status(500).json({
      message: error.message,
    });
  }
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

const downloadQuizResultPDF = async (req, res) => {
  try {
    const { attemptId } = req.params;

    // Validate logged-in user
    if (!req.user) {
      return res.status(401).json({
        message: "Unauthorized. User information is missing.",
      });
    }

    // Support both req.user._id and req.user.id
    const studentId = req.user._id || req.user.id;

    if (!studentId) {
      return res.status(401).json({
        message: "Unauthorized. Student ID is missing.",
      });
    }

    // Validate attempt ID
    if (!mongoose.Types.ObjectId.isValid(attemptId)) {
      return res.status(400).json({
        message: "Invalid attempt ID",
      });
    }

    const attempt = await Attempt.findOne({
      _id: attemptId,
      studentId: studentId,
    })
      .populate("quizId")
      .lean();

    if (!attempt) {
      return res.status(404).json({
        message: "Attempt not found",
      });
    }

    if (!attempt.quizId) {
      return res.status(404).json({
        message: "Quiz details not found for this attempt",
      });
    }

    const quiz = attempt.quizId;

    const quizTitle = quiz.title || "Quiz";
    const studentName =
      req.user.name ||
      req.user.fullName ||
      req.user.username ||
      "Student";

    const questions = Array.isArray(quiz.questions)
      ? quiz.questions
      : [];

    const answers = Array.isArray(attempt.answers)
      ? attempt.answers
      : [];

    const totalQuestions = questions.length;

    const score =
      typeof attempt.score === "number"
        ? attempt.score
        : answers.filter((answer) => answer.isCorrect === true).length;

    const correctAnswers = answers.filter(
      (answer) => answer.isCorrect === true
    ).length;

    const wrongAnswers = answers.filter(
      (answer) => answer.isCorrect === false
    ).length;

    const attemptedQuestions = answers.filter(
      (answer) =>
        answer.selectedOption !== undefined &&
        answer.selectedOption !== null &&
        answer.selectedOption !== ""
    ).length;

    const percentage =
      totalQuestions > 0
        ? ((score / totalQuestions) * 100).toFixed(2)
        : "0.00";

    const submittedAt = attempt.submittedAt
      ? new Date(attempt.submittedAt).toLocaleString()
      : "Not available";

    const safeFileName = quizTitle
      .replace(/[^a-z0-9]/gi, "_")
      .toLowerCase();

    // Create PDF
    const doc = new PDFDocument({
      size: "A4",
      margin: 45,
      bufferPages: true,
      info: {
        Title: `${quizTitle} Result`,
        Author: "Study Stream",
        Subject: "Quiz Result",
      },
    });

    // Response headers
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${safeFileName}-result.pdf"`
    );

    doc.pipe(res);

    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const leftMargin = doc.page.margins.left;
    const rightMargin = pageWidth - doc.page.margins.right;
    const contentWidth = rightMargin - leftMargin;

    const colors = {
      primary: "#2563eb",
      dark: "#1f2937",
      gray: "#6b7280",
      lightGray: "#f3f4f6",
      border: "#d1d5db",
      green: "#15803d",
      red: "#b91c1c",
      orange: "#c2410c",
    };

    const optionLabels = ["A", "B", "C", "D", "E", "F"];

    const getQuestionText = (question) => {
      return (
        question.question ||
        question.questionText ||
        question.text ||
        "Question"
      );
    };

    const getOptions = (question) => {
      if (Array.isArray(question.options)) {
        return question.options;
      }

      return [];
    };

    const getCorrectOption = (question) => {
      if (question.correctAnswer !== undefined) {
        return question.correctAnswer;
      }

      if (question.correctOption !== undefined) {
        return question.correctOption;
      }

      if (question.answer !== undefined) {
        return question.answer;
      }

      return null;
    };

    const getSelectedOption = (answer) => {
      if (!answer) {
        return null;
      }

      if (answer.selectedOption !== undefined) {
        return answer.selectedOption;
      }

      if (answer.selectedAnswer !== undefined) {
        return answer.selectedAnswer;
      }

      if (answer.answer !== undefined) {
        return answer.answer;
      }

      return null;
    };

    const normalizeOption = (value, options) => {
      if (value === null || value === undefined) {
        return null;
      }

      if (typeof value === "number") {
        return value;
      }

      const stringValue = String(value).trim();

      const letterIndex = optionLabels.indexOf(stringValue.toUpperCase());

      if (letterIndex !== -1) {
        return letterIndex;
      }

      const optionIndex = options.findIndex(
        (option) => String(option).trim() === stringValue
      );

      if (optionIndex !== -1) {
        return optionIndex;
      }

      return stringValue;
    };

    const getOptionText = (option) => {
      if (option === null || option === undefined) {
        return "Not answered";
      }

      if (typeof option === "object") {
        return (
          option.text ||
          option.label ||
          option.value ||
          JSON.stringify(option)
        );
      }

      return String(option);
    };

    const getCorrectAnswerText = (question, options) => {
      const correctOption = getCorrectOption(question);

      if (correctOption === null || correctOption === undefined) {
        return "Not available";
      }

      if (
        typeof correctOption === "number" &&
        options[correctOption] !== undefined
      ) {
        return getOptionText(options[correctOption]);
      }

      if (
        typeof correctOption === "string" &&
        options.includes(correctOption)
      ) {
        return correctOption;
      }

      const normalized = normalizeOption(correctOption, options);

      if (
        typeof normalized === "number" &&
        options[normalized] !== undefined
      ) {
        return getOptionText(options[normalized]);
      }

      return getOptionText(correctOption);
    };

    const drawHeader = () => {
      doc
        .fillColor(colors.primary)
        .fontSize(22)
        .font("Helvetica-Bold")
        .text("Study Stream", leftMargin, 40);

      doc
        .fillColor(colors.dark)
        .fontSize(17)
        .font("Helvetica-Bold")
        .text("Quiz Result", leftMargin, 72);

      doc
        .fillColor(colors.gray)
        .fontSize(10)
        .font("Helvetica")
        .text(quizTitle, leftMargin, 98);

      doc
        .moveTo(leftMargin, 118)
        .lineTo(rightMargin, 118)
        .strokeColor(colors.border)
        .stroke();
    };

    const drawFooter = () => {
      const currentPage = doc.bufferedPageRange().count;

      doc
        .fontSize(8)
        .fillColor(colors.gray)
        .text(
          `Generated by Study Stream • Page ${currentPage}`,
          leftMargin,
          pageHeight - 35,
          {
            width: contentWidth,
            align: "center",
          }
        );
    };

    const drawSummaryCard = () => {
      const startY = 145;
      const cardHeight = 145;
      const gap = 10;
      const cardWidth = (contentWidth - gap * 2) / 3;

      doc
        .roundedRect(leftMargin, startY, contentWidth, cardHeight, 8)
        .fillColor(colors.lightGray)
        .fill();

      doc
        .fillColor(colors.dark)
        .font("Helvetica-Bold")
        .fontSize(11)
        .text("Student", leftMargin + 15, startY + 15);

      doc
        .fillColor(colors.dark)
        .font("Helvetica")
        .fontSize(11)
        .text(studentName, leftMargin + 15, startY + 34, {
          width: contentWidth - 30,
        });

      doc
        .fillColor(colors.gray)
        .fontSize(9)
        .text(`Submitted: ${submittedAt}`, leftMargin + 15, startY + 55);

      const statsY = startY + 82;

      const drawStat = (x, label, value, color) => {
        doc
          .roundedRect(x, statsY, cardWidth, 45, 5)
          .fillColor("#ffffff")
          .fill();

        doc
          .fillColor(color)
          .font("Helvetica-Bold")
          .fontSize(16)
          .text(String(value), x, statsY + 8, {
            width: cardWidth,
            align: "center",
          });

        doc
          .fillColor(colors.gray)
          .font("Helvetica")
          .fontSize(8)
          .text(label, x, statsY + 28, {
            width: cardWidth,
            align: "center",
          });
      };

      drawStat(leftMargin + 15, "Score", `${score}/${totalQuestions}`, colors.primary);
      drawStat(
        leftMargin + 15 + cardWidth + gap,
        "Percentage",
        `${percentage}%`,
        colors.orange
      );
      drawStat(
        leftMargin + 15 + (cardWidth + gap) * 2,
        "Correct",
        correctAnswers,
        colors.green
      );

      doc
        .fillColor(colors.gray)
        .font("Helvetica")
        .fontSize(9)
        .text(
          `Attempted: ${attemptedQuestions}   |   Wrong: ${wrongAnswers}   |   Unanswered: ${
            totalQuestions - attemptedQuestions
          }`,
          leftMargin + 15,
          startY + cardHeight - 15
        );

      return startY + cardHeight + 25;
    };

    const drawQuestion = (question, index) => {
      const questionText = getQuestionText(question);
      const options = getOptions(question);

      const answer = answers.find((item) => {
        const answerQuestionId =
          item.questionId || item.question || item._id;

        const currentQuestionId = question._id;

        return (
          answerQuestionId &&
          currentQuestionId &&
          String(answerQuestionId) === String(currentQuestionId)
        );
      });

      const selectedOption = getSelectedOption(answer);
      const correctOption = getCorrectOption(question);

      const normalizedSelected = normalizeOption(
        selectedOption,
        options
      );

      const normalizedCorrect = normalizeOption(
        correctOption,
        options
      );

      const isCorrect =
        answer?.isCorrect === true ||
        (normalizedSelected !== null &&
          normalizedCorrect !== null &&
          String(normalizedSelected) === String(normalizedCorrect));

      const questionStartY = doc.y;

      doc
        .font("Helvetica-Bold")
        .fontSize(11)
        .fillColor(colors.dark)
        .text(`${index + 1}. ${questionText}`, {
          width: contentWidth,
          lineGap: 3,
        });

      doc.moveDown(0.5);

      options.forEach((option, optionIndex) => {
        const optionText = getOptionText(option);

        const isSelected =
          normalizedSelected !== null &&
          String(normalizedSelected) === String(optionIndex);

        const isCorrectOption =
          normalizedCorrect !== null &&
          String(normalizedCorrect) === String(optionIndex);

        let backgroundColor = "#ffffff";
        let borderColor = colors.border;
        let textColor = colors.dark;
        let prefix = "";

        if (isCorrectOption) {
          backgroundColor = "#dcfce7";
          borderColor = colors.green;
          textColor = colors.green;
          prefix = "Correct answer";
        } else if (isSelected && !isCorrect) {
          backgroundColor = "#fee2e2";
          borderColor = colors.red;
          textColor = colors.red;
          prefix = "Your answer";
        }

        const optionY = doc.y;
        const optionHeight = 25;

        doc
          .roundedRect(
            leftMargin + 8,
            optionY,
            contentWidth - 16,
            optionHeight,
            4
          )
          .fillColor(backgroundColor)
          .fill()
          .strokeColor(borderColor)
          .stroke();

        doc
          .fillColor(textColor)
          .font("Helvetica")
          .fontSize(9)
          .text(
            `${optionLabels[optionIndex] || optionIndex + 1}. ${optionText}`,
            leftMargin + 16,
            optionY + 8,
            {
              width: contentWidth - 32,
            }
          );

        if (prefix) {
          doc
            .fillColor(textColor)
            .fontSize(7)
            .text(prefix, rightMargin - 90, optionY + 8, {
              width: 75,
              align: "right",
            });
        }

        doc.y = optionY + optionHeight + 5;
      });

      if (selectedOption === null || selectedOption === undefined) {
        doc
          .fillColor(colors.gray)
          .font("Helvetica-Oblique")
          .fontSize(9)
          .text("Your answer: Not answered");
      }

      doc
        .fillColor(isCorrect ? colors.green : colors.red)
        .font("Helvetica-Bold")
        .fontSize(9)
        .text(isCorrect ? "Result: Correct" : "Result: Incorrect");

      doc
        .fillColor(colors.gray)
        .font("Helvetica")
        .fontSize(9)
        .text(
          `Correct answer: ${getCorrectAnswerText(question, options)}`
        );

      doc.moveDown(1);

      const bottomY = doc.y;

      doc
        .moveTo(leftMargin, bottomY)
        .lineTo(rightMargin, bottomY)
        .strokeColor("#e5e7eb")
        .stroke();

      doc.moveDown(1);

      // Prevent unused variable warnings in some linters
      return questionStartY;
    };

    // First page
    drawHeader();

    let currentY = drawSummaryCard();

    doc.y = currentY;

    doc
      .fillColor(colors.dark)
      .font("Helvetica-Bold")
      .fontSize(15)
      .text("Question-wise Review");

    doc.moveDown(1);

    questions.forEach((question, index) => {
      // Add a new page when the question does not fit
      if (doc.y > pageHeight - 180) {
        doc.addPage();
        drawHeader();
        doc.y = 140;
      }

      drawQuestion(question, index);
    });

    // Add page numbers and footer to all pages
    const range = doc.bufferedPageRange();

    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(i);

      doc
        .fontSize(8)
        .fillColor(colors.gray)
        .text(
          `Page ${i + 1} of ${range.count}`,
          leftMargin,
          pageHeight - 35,
          {
            width: contentWidth,
            align: "center",
          }
        );
    }

    doc.end();
  } catch (error) {
    console.error("PDF export error:", error);

    if (!res.headersSent) {
      return res.status(500).json({
        message: "Unable to export quiz result PDF",
        error: error.message,
      });
    }

    res.end();
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
  downloadQuizResultPDF,
};
