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

    const attempt = await Attempt.findOne({
      _id: attemptId,
      studentId: req.user._id,
    })
      .populate("quizId")
      .lean();

    if (!attempt) {
      return res.status(404).json({
        message: "Attempt not found",
      });
    }

    const quiz = attempt.quizId;

    const doc = new PDFDocument({
      size: "A4",
      margin: 45,
      bufferPages: true,
      info: {
        Title: `${quiz.title || "Quiz"} Result`,
        Author: "Study Stream",
      },
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${(quiz.title || "quiz")
        .replace(/[^a-z0-9]/gi, "_")
        .toLowerCase()}-result.pdf"`
    );

    doc.pipe(res);

    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const contentWidth =
      pageWidth - doc.page.margins.left - doc.page.margins.right;

    const colors = {
      dark: "#1F2937",
      gray: "#6B7280",
      border: "#D1D5DB",
      lightGray: "#F3F4F6",
      green: "#DCFCE7",
      greenBorder: "#86EFAC",
      red: "#FEE2E2",
      redBorder: "#FCA5A5",
      blue: "#DBEAFE",
      blueBorder: "#93C5FD",
      white: "#FFFFFF",
    };

    const safeText = (value) => {
      if (value === null || value === undefined) return "";
      return String(value);
    };

    const isCode = (text) => {
      const value = safeText(text);

      return (
        value.includes("```") ||
        value.includes("=>") ||
        value.includes("const ") ||
        value.includes("let ") ||
        value.includes("var ") ||
        value.includes("function ") ||
        value.includes("import ") ||
        value.includes("export ") ||
        value.includes("SELECT ") ||
        value.includes("<?php") ||
        value.includes("<div") ||
        value.includes("</") ||
        value.includes("{") ||
        value.includes("}") ||
        value.includes("console.log")
      );
    };

    const cleanCode = (text) => {
      return safeText(text)
        .replace(/^```[a-zA-Z0-9]*\s*/, "")
        .replace(/```$/g, "")
        .trim();
    };

    const drawHeader = () => {
      doc
        .font("Helvetica-Bold")
        .fontSize(20)
        .fillColor(colors.dark)
        .text(quiz.title || "Quiz Result", {
          align: "center",
          width: contentWidth,
        });

      doc.moveDown(0.4);

      doc
        .font("Helvetica")
        .fontSize(10)
        .fillColor(colors.gray)
        .text(`Student: ${req.user.name || "Student"}`, {
          align: "center",
          width: contentWidth,
        });

      doc
        .fontSize(10)
        .text(`Submitted: ${new Date(attempt.submittedAt).toLocaleString()}`, {
          align: "center",
          width: contentWidth,
        });

      doc.moveDown(0.8);

      doc
        .moveTo(doc.page.margins.left, doc.y)
        .lineTo(pageWidth - doc.page.margins.right, doc.y)
        .strokeColor(colors.border)
        .stroke();

      doc.moveDown(0.8);
    };

    const ensureSpace = (height = 40) => {
      if (doc.y + height > pageHeight - doc.page.margins.bottom) {
        doc.addPage();
        doc.y = doc.page.margins.top;
      }
    };

    const drawStatusBadge = (label, background, border) => {
      const badgeWidth = doc.widthOfString(label) + 18;
      const badgeHeight = 19;

      ensureSpace(badgeHeight + 8);

      const x = pageWidth - doc.page.margins.right - badgeWidth;

      doc
        .roundedRect(x, doc.y - 3, badgeWidth, badgeHeight, 5)
        .fillAndStroke(background, border);

      doc
        .font("Helvetica-Bold")
        .fontSize(8)
        .fillColor(colors.dark)
        .text(label, x + 9, doc.y + 2, {
          width: badgeWidth - 18,
          align: "center",
        });
    };

    const drawCodeBlock = (code) => {
      const value = cleanCode(code);
      const lines = value.split("\n");

      const lineHeight = 11;
      const padding = 9;
      const blockHeight = lines.length * lineHeight + padding * 2;

      ensureSpace(Math.min(blockHeight, 100));

      doc
        .roundedRect(
          doc.page.margins.left,
          doc.y,
          contentWidth,
          blockHeight,
          5
        )
        .fillAndStroke("#F9FAFB", colors.border);

      doc
        .font("Courier")
        .fontSize(8.5)
        .fillColor(colors.dark)
        .text(value, doc.page.margins.left + padding, doc.y + padding, {
          width: contentWidth - padding * 2,
          lineGap: 2,
        });

      doc.y += blockHeight + 8;
    };

    const drawTable = (text) => {
      const rows = safeText(text)
        .split("\n")
        .map((row) => row.split(";").map((cell) => cell.trim()))
        .filter((row) => row.some((cell) => cell.length > 0));

      if (!rows.length) return;

      const columnCount = Math.max(...rows.map((row) => row.length));
      const columnWidth = contentWidth / columnCount;
      const cellPadding = 5;
      const fontSize = 8.5;

      rows.forEach((row, rowIndex) => {
        const normalizedRow = [...row];

        while (normalizedRow.length < columnCount) {
          normalizedRow.push("");
        }

        const rowHeights = normalizedRow.map((cell) => {
          return doc.heightOfString(cell, {
            width: columnWidth - cellPadding * 2,
            font: "Helvetica",
            fontSize,
            lineGap: 2,
          });
        });

        const rowHeight =
          Math.max(...rowHeights, 12) + cellPadding * 2;

        ensureSpace(rowHeight + 3);

        const rowY = doc.y;

        normalizedRow.forEach((cell, columnIndex) => {
          const cellX =
            doc.page.margins.left + columnIndex * columnWidth;

          const isHeader = rowIndex === 0;

          doc
            .rect(cellX, rowY, columnWidth, rowHeight)
            .fillAndStroke(
              isHeader ? colors.lightGray : colors.white,
              colors.border
            );

          doc
            .font(isHeader ? "Helvetica-Bold" : "Helvetica")
            .fontSize(fontSize)
            .fillColor(colors.dark)
            .text(cell, cellX + cellPadding, rowY + cellPadding, {
              width: columnWidth - cellPadding * 2,
              lineGap: 2,
            });
        });

        doc.y = rowY + rowHeight;
      });

      doc.moveDown(0.5);
    };

    const drawRichText = (text) => {
      const value = safeText(text);

      if (!value.trim()) return;

      if (isCode(value)) {
        drawCodeBlock(value);
        return;
      }

      if (value.includes(";")) {
        drawTable(value);
        return;
      }

      ensureSpace(25);

      doc
        .font("Helvetica")
        .fontSize(9.5)
        .fillColor(colors.dark)
        .text(value, {
          width: contentWidth,
          lineGap: 3,
        });

      doc.moveDown(0.35);
    };

    const getAnswerIndex = (answer) => {
      if (answer === null || answer === undefined) return null;

      if (typeof answer === "number") return answer;

      if (typeof answer === "object") {
        if (typeof answer.selectedOption === "number") {
          return answer.selectedOption;
        }

        if (typeof answer.optionIndex === "number") {
          return answer.optionIndex;
        }

        if (typeof answer.answer === "number") {
          return answer.answer;
        }
      }

      return null;
    };

    const getCorrectIndex = (question) => {
      if (typeof question.correctAnswer === "number") {
        return question.correctAnswer;
      }

      if (typeof question.correctOption === "number") {
        return question.correctOption;
      }

      if (typeof question.answer === "number") {
        return question.answer;
      }

      return null;
    };

    const getSelectedAnswer = (question) => {
      const savedAnswer = (attempt.answers || []).find((answer) => {
        const questionId =
          answer.questionId?._id ||
          answer.questionId ||
          answer.question;

        return String(questionId) === String(question._id);
      });

      return getAnswerIndex(savedAnswer);
    };

    drawHeader();

    const totalQuestions = quiz.questions?.length || 0;
    const answeredQuestions = (attempt.answers || []).filter(
      (answer) => getAnswerIndex(answer) !== null
    ).length;

    const correctQuestions = quiz.questions?.filter((question) => {
      const selected = getSelectedAnswer(question);
      const correct = getCorrectIndex(question);

      return selected !== null && correct !== null && selected === correct;
    }).length || 0;

    const score = attempt.score ?? correctQuestions;

    ensureSpace(75);

    doc
      .roundedRect(
        doc.page.margins.left,
        doc.y,
        contentWidth,
        65,
        8
      )
      .fillAndStroke("#F9FAFB", colors.border);

    doc
      .font("Helvetica-Bold")
      .fontSize(12)
      .fillColor(colors.dark)
      .text("Result Summary", doc.page.margins.left + 12, doc.y + 10);

    doc
      .font("Helvetica")
      .fontSize(10)
      .text(
        `Score: ${score} / ${totalQuestions}`,
        doc.page.margins.left + 12,
        doc.y + 29
      );

    doc.text(
      `Attempted: ${answeredQuestions} / ${totalQuestions}`,
      doc.page.margins.left + 190,
      doc.y - 12
    );

    doc.text(
      `Correct: ${correctQuestions}`,
      doc.page.margins.left + 365,
      doc.y - 12
    );

    doc.y += 82;

    quiz.questions.forEach((question, questionIndex) => {
      const options = question.options || [];
      const selectedIndex = getSelectedAnswer(question);
      const correctIndex = getCorrectIndex(question);
      const attempted = selectedIndex !== null;

      ensureSpace(90);

      doc
        .roundedRect(
          doc.page.margins.left,
          doc.y,
          contentWidth,
          30,
          5
        )
        .fillAndStroke(colors.lightGray, colors.border);

      doc
        .font("Helvetica-Bold")
        .fontSize(10.5)
        .fillColor(colors.dark)
        .text(
          `Question ${questionIndex + 1}`,
          doc.page.margins.left + 10,
          doc.y + 9
        );

      drawStatusBadge(
        attempted ? "Attempted" : "Not Attempted",
        attempted ? colors.blue : colors.lightGray,
        attempted ? colors.blueBorder : colors.border
      );

      doc.y += 39;

      drawRichText(question.question || question.text || "");

      options.forEach((option, optionIndex) => {
        const optionText =
          typeof option === "string"
            ? option
            : option.text || option.label || option.value || "";

        const isSelected = selectedIndex === optionIndex;
        const isCorrect = correctIndex === optionIndex;
        const isWrongSelected = isSelected && !isCorrect;

        let background = colors.white;
        let border = colors.border;

        if (isCorrect) {
          background = colors.green;
          border = colors.greenBorder;
        }

        if (isWrongSelected) {
          background = colors.red;
          border = colors.redBorder;
        }

        const prefix = `${String.fromCharCode(65 + optionIndex)}. `;
        const displayText = `${prefix}${optionText}`;

        const textHeight = doc.heightOfString(displayText, {
          width: contentWidth - 45,
          font: "Helvetica",
          fontSize: 9.5,
          lineGap: 2,
        });

        const optionHeight = Math.max(27, textHeight + 14);

        ensureSpace(optionHeight + 5);

        const optionY = doc.y;

        doc
          .roundedRect(
            doc.page.margins.left,
            optionY,
            contentWidth,
            optionHeight,
            5
          )
          .fillAndStroke(background, border);

        doc
          .font(isCorrect || isSelected ? "Helvetica-Bold" : "Helvetica")
          .fontSize(9.5)
          .fillColor(colors.dark)
          .text(displayText, doc.page.margins.left + 10, optionY + 7, {
            width: contentWidth - 45,
            lineGap: 2,
          });

        if (isCorrect) {
          doc
            .font("Helvetica-Bold")
            .fontSize(8)
            .fillColor("#166534")
            .text("✓ Correct", pageWidth - 105, optionY + 8);
        }

        if (isWrongSelected) {
          doc
            .font("Helvetica-Bold")
            .fontSize(8)
            .fillColor("#991B1B")
            .text("✗ Wrong", pageWidth - 105, optionY + 8);
        }

        doc.y = optionY + optionHeight + 5;
      });

      if (!attempted) {
        doc
          .font("Helvetica-Oblique")
          .fontSize(9)
          .fillColor(colors.gray)
          .text("Not Attempted", {
            width: contentWidth,
          });

        doc.moveDown(0.4);
      }

      doc.moveDown(0.7);
    });

    const range = doc.bufferedPageRange();

    for (let pageIndex = 0; pageIndex < range.count; pageIndex++) {
      doc.switchToPage(range.start + pageIndex);

      doc
        .font("Helvetica")
        .fontSize(8)
        .fillColor(colors.gray)
        .text(
          `Page ${pageIndex + 1} of ${range.count}`,
          doc.page.margins.left,
          pageHeight - 28,
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
