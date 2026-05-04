const Quiz = require("../models/Quiz");
const Progress = require("../models/Progress");
const prisma = require("../config/db");

const createQuiz = async (req, res) => {
  try {
    const quiz = await Quiz.create({ ...req.body, createdBy: req.user.userId });
    res.status(201).json({ success: true, quiz });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getAllQuizzes = async (req, res) => {
  try {
    const quizzes = await Quiz.findAll();
    let solvedIds = [];
    if (req.user?.role === "student") {
      const progress = await Progress.findAllByStudent(req.user.userId);
      solvedIds = progress
        .filter((p) => p.status === "completed" && p.quizId)
        .map((p) => p.quizId);
    }
    res.json({
      success: true,
      quizzes: quizzes.map((q) => ({
        ...q,
        _id: q.id,
        type: "quiz",
        isSolved: solvedIds.includes(q.id),
      })),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getQuizById = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz)
      return res
        .status(404)
        .json({ success: false, message: "Quiz not found" });

    quiz.type = "quiz";

    // Attach isSolved and savedAnswers for students
    if (req.user && req.user.role === "student") {
      const progressRecords = await Progress.findAllByStudent(req.user.userId);
      const record = progressRecords.find(
        (p) =>
          p.quizId === quiz.id ||
          (p.contentId === quiz.id && p.contentType === "quiz"),
      );
      quiz.isSolved = record?.status === "completed" || false;

      if (quiz.isSolved) {
        try {
          const sub = await prisma.submission.findFirst({
            where: {
              studentId: req.user.userId,
              quizId: quiz.id,
              language: "json",
            },
            orderBy: { createdAt: "desc" },
          });
          if (sub && sub.code) {
            try {
              quiz.savedAnswers = JSON.parse(sub.code);
            } catch (e) {}
          }
        } catch (e) {}
      }
    }

    res.json({ success: true, quiz, problem: quiz });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateQuiz = async (req, res) => {
  try {
    const quiz = await Quiz.update(req.params.id, req.body);
    if (!quiz)
      return res
        .status(404)
        .json({ success: false, message: "Quiz not found" });
    res.json({ success: true, quiz });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteQuiz = async (req, res) => {
  try {
    const quiz = await Quiz.delete(req.params.id);
    if (!quiz)
      return res
        .status(404)
        .json({ success: false, message: "Quiz not found" });
    res.json({ success: true, message: "Quiz deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createQuiz,
  getAllQuizzes,
  getQuizById,
  updateQuiz,
  deleteQuiz,
};
