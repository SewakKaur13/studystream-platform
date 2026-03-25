const Quiz = require("../models/Quiz");
const Attempt = require("../models/Attempt");
const QuizLock = require ("../models/QuizLock");

// CREATE QUIZ
const createQuiz = async (req, res) => {
  try {
    //parse JSON data
    const quizData = JSON.parse(req.body.data);

    //attach images if present
    if (req.files && req.files.length > 0) {
      req.files.forEach((file) => {
        const index = file.fieldname.split("-")[1];

        if (quizData.questions[index]) {
          quizData.questions[index].questionImage = file.path;
        }
      });
    }

    const quiz = new Quiz(quizData);
    await quiz.save();

    res.json({
      message: "Quiz created successfully",
      quiz,
    });

  } catch (error) {
    res.status(500).json({
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
    console.log("BODY:", req.body);
    console.log("FILES:", req.files);

    // Parse JSON safely
    let quizData = req.body.data
      ? JSON.parse(req.body.data)
      : req.body;

    // Attach uploaded images
    if (req.files && req.files.length > 0) {
      req.files.forEach((file) => {
        const index = file.fieldname.split("-")[1];

        if (quizData.questions[index]) {
          quizData.questions[index].questionImage = file.path;
        }
      });
    }

    // Update DB
    const updatedQuiz = await Quiz.findByIdAndUpdate(
      req.params.id,
      quizData,
      { new: true }
    );

    if (!updatedQuiz) {
      return res.status(404).json({
        message: "Quiz not found",
      });
    }

    res.json({
      message: "Quiz updated successfully",
      quiz: updatedQuiz,
    });

  } catch (error) {
    console.error("UPDATE ERROR:", error);
    res.status(500).json({
      message: error.message,
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