const Problem = require("../models/Problem");
const SqlProblem = require("../models/SqlProblem");
const Video = require("../models/Video");
const Quiz = require("../models/Quiz");
const Article = require("../models/PrivateArticle");
const prisma = require("../config/db");
const Progress = require("../models/Progress");

const findAcrossModels = async (idOrSlug) => {
  const list = [
    { Model: Problem, type: "problem" },
    { Model: SqlProblem, type: "sql" },
    { Model: Video, type: "video" },
    { Model: Quiz, type: "quiz" },
    { Model: Article, type: "article" },
  ];
  for (const item of list) {
    const found = await item.Model.findById(idOrSlug);
    if (found) return { item: found, type: item.type };
  }

  // Check Assignments
  try {
    const assignment = await prisma.assignment.findUnique({
      where: { id: idOrSlug }
    });
    if (assignment) return { item: assignment, type: 'assignment' };
  } catch (e) {
    // Not a UUID or not found, ignore
  }

  return null;
};

const getContent = async (req, res) => {
  try {
    const [coding, sql, video, quiz, article, assignments] = await Promise.all([
      Problem.findAllSummary(),
      SqlProblem.findAllSummary(),
      Video.findAllSummary(),
      Quiz.findAllSummary(),
      Article.findAllSummary(),
      prisma.assignment.findMany({
          select: {
              id: true,
              title: true,
              type: true,
              difficulty: true,
              createdAt: true
          }
      })
    ]);

    let contents = [
      ...coding.map((p) => ({ ...p, type: "problem" })),
      ...sql.map((p) => ({ ...p, type: "sql" })),
      ...video.map((p) => ({ ...p, type: "video" })),
      ...quiz.map((p) => ({ ...p, type: "quiz" })),
      ...article.map((p) => ({ ...p, type: "article" })),
      ...assignments.map((a) => ({ ...a, type: "assignment" })),
    ];

    let solvedIds = [];
    if (req.user && req.user.role === "student") {
      const progressRecords = await Progress.findAllByStudent(req.user.userId);
      solvedIds = progressRecords
        .filter((p) => p.status === "completed")
        .map(
          (p) =>
            p.problemId ||
            p.sqlProblemId ||
            p.videoId ||
            p.quizId ||
            p.articleId ||
            p.assignmentId,
        );
    }

    res.json({
      success: true,
      count: contents.length,
      problems: contents.map((p) => ({
        id: p.slug || p.id,
        _id: p.id,
        title: p.title,
        type: p.type,
        section: p.section,
        difficulty: p.difficulty,
        points: p.type === "problem" || p.type === "sql" || p.type === "practical" ? p.points || 0 : 0,
        createdAt: p.createdAt,
        isSolved: solvedIds.includes(p.id),
      })),
    });
  } catch (error) {
    res
      .status(500)
      .json({
        success: false,
        message: "Failed to fetch content",
        error: error.message,
      });
  }
};

const getContentById = async (req, res) => {
  try {
    const { idOrSlug } = req.params;
    const result = await findAcrossModels(idOrSlug);
    if (!result)
      return res
        .status(404)
        .json({ success: false, message: "Content not found" });

    const { item, type } = result;
    item.type = type;

    // Student tracking metadata
    if (req.user && req.user.role === "student") {
      const hasViewed = await Progress.hasViewedEditorial(
        req.user.userId,
        item.id,
        type,
      );
      const progressRecords = await Progress.findAllByStudent(req.user.userId);
      const record = progressRecords.find(
        (p) =>
          p.contentId === item.id ||
          (p.problemId === item.id && type === "problem") ||
          (p.sqlProblemId === item.id && type === "sql") ||
          (p.videoId === item.id && type === "video") ||
          (p.quizId === item.id && type === "quiz") ||
          (p.articleId === item.id && type === "article") ||
          (p.assignmentId === item.id && type === "assignment"),
      );
      item.isSolved = record?.status === "completed" || false;
      res.locals.hasViewedEditorial = hasViewed;

      if (item.isSolved && (type === "quiz" || type === "video")) {
        try {
          const prisma = require("../config/db");
          const fkField = type === "quiz" ? "quizId" : "videoId";
          const quizSub = await prisma.submission.findFirst({
            where: {
              studentId: req.user.userId,
              [fkField]: item.id,
              language: "json",
            },
            orderBy: { createdAt: "desc" },
          });
          if (quizSub && quizSub.code) {
            try {
              item.savedAnswers = JSON.parse(quizSub.code);
            } catch (e2) {}
          }
        } catch (e) {}
      }
    }

    // Privacy filters
    if (req.user && req.user.role === "student") {
      if (item.testCases) {
        item.testCases = item.testCases.map((tc) => ({
          ...tc,
          input: tc.isHidden ? "Hidden" : tc.input,
          output: tc.isHidden ? "Hidden" : tc.output,
        }));
      }
      delete item.solutionCode;
    }

    // Renaming editorial to article for consistency if needed
    if (type !== "problem" && item.editorial) {
      item.article = item.editorial;
      item.articleLink = item.editorialLink;
    }

    res.json({
      success: true,
      problem: item,
      hasViewedEditorial: res.locals.hasViewedEditorial || false,
    });
  } catch (error) {
    console.error("Get content by ID error:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error fetching content" });
  }
};

module.exports = { getContent, getContentById };
