const Quiz = require("../models/Quiz");
const Attempt = require("../models/Attempt");
const QuizLock = require ("../models/QuizLock");

// CREATE QUIZ
const createQuiz = async (req, res) => {
  try {

    const quiz = new Quiz(req.body);

    await quiz.save();

    res.json({
      message: "Quiz created successfully",
      quiz
    });

  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};

// GET QUIZ BY ID
const getQuizById = async (req, res) => {
  try {

    const quiz = await Quiz.findById(req.params.id);

    if (!quiz) {
      return res.status(404).json({
        message: "Quiz not found"
      });
    }

    res.json(quiz);

  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};

// UPDATE QUIZ
const updateQuiz = async (req, res) => {
  try {

    const updatedQuiz = await Quiz.findByIdAndUpdate(
      req.params.id,
      req.body,
      { returnDocument: "after" }
    );

    if (!updatedQuiz) {
      return res.status(404).json({
        message: "Quiz not found"
      });
    }

    res.json({
      message: "Quiz updated successfully",
      quiz: updatedQuiz
    });

  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};

//Card View of Quizes
const getAllQuizzes = async (req, res) => {
  try {

    const quizzes = await Quiz.find();

    const quizzesWithCounts = await Promise.all(
      quizzes.map(async (q) => {

        const attempts = await Attempt.countDocuments({
          quizId: q._id
        });

        return {
          _id: q._id,
          title: q.title,
          description: q.description,
          duration: q.duration,
          totalQuestions: q.questions.length,
          attempts: attempts,
          createdAt: q.createdAt,
          status: q.status
        };

      })
    );

    res.json(quizzesWithCounts);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

//Delete Quiz
const deleteQuiz = async (req, res) => {
  try {

    const quizId = req.params.id;

    const quiz = await Quiz.findByIdAndDelete(quizId);

    if (!quiz) {
      return res.status(404).json({
        message: "Quiz not found"
      });
    }

    await Attempt.deleteMany({ quizId: quizId });

    res.json({
      message: "Quiz deleted successfully"
    });

  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};




module.exports = {
  createQuiz,
  getQuizById,
  updateQuiz,
  getAllQuizzes,
  deleteQuiz
};