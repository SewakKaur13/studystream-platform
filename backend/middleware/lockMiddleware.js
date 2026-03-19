export const checkLock = async (req, res, next) => {
  const { quizId, studentId } = req.body; // or req.params
  const lock = await QuizLock.findOne({ quizId, studentId });

  if (lock && new Date(lock.lockedUntil) > new Date()) {
    return res.status(403).json({ message: "Quiz is locked" });
  }

  next();
};