const Quiz = require("../models/Quiz");
const Attempt = require("../models/Attempt");
const QuizLock = require("../models/QuizLock");

// Supported code languages
const allowedCodeLanguages = [
  "text",
  "java",
  "javascript",
  "python",
  "cpp",
  "c",
  "sql",
  "html",
  "css",
  "dsa",
  "os",
];

// Normalize one question before saving
const normalizeQuestion = (question = {}) => {
  const codeLanguage = allowedCodeLanguages.includes(
    question.codeLanguage,
  )
    ? question.codeLanguage
    : "text";

  return {
    questionText:
      question.text ||
      question.questionText ||
      "",

    questionCode:
      typeof question.questionCode === "string"
        ? question.questionCode
        : "",

    codeLanguage,

    options: Array.isArray(question.options)
      ? question.options
      : [],

    correctAnswer: Number(question.correctAnswer),

    questionImage:
      question.questionImage || null,
  };
};

// CREATE QUIZ
const createQuiz = async (req, res) => {
  try {
    if (!req.body.data) {
      return res.status(400).json({
        message: "Quiz data is required",
      });
    }

    let quizData;

    try {
      quizData = JSON.parse(req.body.data);
    } catch (error) {
      return res.status(400).json({
        message: "Invalid quiz data JSON",
      });
    }

    if (
      !quizData.questions ||
      !Array.isArray(quizData.questions) ||
      quizData.questions.length === 0
    ) {
      return res.status(400).json({
        message: "At least one question is required",
      });
    }

    // Attach uploaded images to the correct question
    if (req.files && req.files.length > 0) {
      req.files.forEach((file) => {
        const fieldParts = file.fieldname.split("-");
        const index = Number(fieldParts[1]);

        if (
          Number.isInteger(index) &&
          quizData.questions[index]
        ) {
          quizData.questions[index].questionImage = file.path;
        }
      });
    }

    // Normalize questions while preserving code and image fields
    quizData.questions = quizData.questions.map((question) =>
      normalizeQuestion(question),
    );

    const quiz = new Quiz({
      ...quizData,
      questions: quizData.questions,
    });

    await quiz.save();

    return res.status(201).json({
      message: "Quiz created successfully",
      quiz,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
};

// GET QUIZ BY ID
const getQuizById = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);

    if (!quiz) {
      return res.status(404).json({
        message: "Quiz not found",
      });
    }

    return res.status(200).json(quiz);
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
};

// UPDATE QUIZ
const updateQuiz = async (req, res) => {
  try {
    let quizData;

    // Parse FormData JSON or normal JSON request
    if (req.body.data) {
      try {
        quizData = JSON.parse(req.body.data);
      } catch (error) {
        return res.status(400).json({
          message: "Invalid quiz data JSON",
        });
      }
    } else {
      quizData = req.body;
    }

    if (
      !quizData.questions ||
      !Array.isArray(quizData.questions)
    ) {
      return res.status(400).json({
        message: "Questions must be provided as an array",
      });
    }

    // Create a map of uploaded files by question index
    const uploadedImages = {};

    if (req.files && req.files.length > 0) {
      req.files.forEach((file) => {
        const fieldParts = file.fieldname.split("-");
        const index = Number(fieldParts[1]);

        if (
          Number.isInteger(index) &&
          file.fieldname.startsWith("questionImage-")
        ) {
          uploadedImages[index] = file.path;
        }
      });
    }

    // Normalize questions
    quizData.questions = quizData.questions.map(
      (question, index) => {
        const normalizedQuestion = normalizeQuestion(question);

        // If a new image is uploaded, use the new image
        if (uploadedImages[index]) {
          normalizedQuestion.questionImage =
            uploadedImages[index];
        } else {
          // Preserve the old image or allow explicit removal
          normalizedQuestion.questionImage =
            Object.prototype.hasOwnProperty.call(
              question,
              "questionImage",
            )
              ? question.questionImage || null
              : null;
        }

        return normalizedQuestion;
      },
    );

    const updatedQuiz = await Quiz.findByIdAndUpdate(
      req.params.id,
      {
        ...quizData,
        questions: quizData.questions,
      },
      {
        new: true,
        runValidators: true,
      },
    );

    if (!updatedQuiz) {
      return res.status(404).json({
        message: "Quiz not found",
      });
    }

    return res.status(200).json({
      message: "Quiz updated successfully",
      quiz: updatedQuiz,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
};

// GET ALL QUIZZES
const getAllQuizzes = async (req, res) => {
  try {
    const quizzes = await Quiz.find().sort({
      createdAt: -1,
    });

    const quizzesWithCounts = await Promise.all(
      quizzes.map(async (quiz) => {
        const attempts = await Attempt.countDocuments({
          quizId: quiz._id,
        });

        return {
          _id: quiz._id,
          title: quiz.title,
          description: quiz.description,
          duration: quiz.duration,
          marksPerQuestion: quiz.marksPerQuestion,
          totalQuestions: quiz.questions.length,
          attempts,
          createdAt: quiz.createdAt,
          status: quiz.status,
        };
      }),
    );

    return res.status(200).json(quizzesWithCounts);
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
};

// DELETE QUIZ
const deleteQuiz = async (req, res) => {
  try {
    const quizId = req.params.id;

    const quiz = await Quiz.findByIdAndDelete(quizId);

    if (!quiz) {
      return res.status(404).json({
        message: "Quiz not found",
      });
    }

    // Delete all attempts related to this quiz
    await Attempt.deleteMany({
      quizId,
    });

    // Delete quiz lock if your QuizLock model uses quizId
    await QuizLock.deleteMany({
      quizId,
    });

    return res.status(200).json({
      message: "Quiz deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
};

module.exports = {
  createQuiz,
  getQuizById,
  updateQuiz,
  getAllQuizzes,
  deleteQuiz,
};