const Article = require("../models/PrivateArticle");
const Progress = require("../models/Progress");

const createArticle = async (req, res) => {
  try {
    const article = await Article.create({
      ...req.body,
      createdBy: req.user.userId,
    });
    res.status(201).json({ success: true, article });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getAllArticles = async (req, res) => {
  try {
    const articles = await Article.findAll();
    let solvedIds = [];
    if (req.user?.role === "student") {
      const progress = await Progress.findAllByStudent(req.user.userId);
      solvedIds = progress
        .filter((p) => p.status === "completed" && p.articleId)
        .map((p) => p.articleId);
    }
    res.json({
      success: true,
      articles: articles.map((a) => ({
        ...a,
        _id: a.id,
        type: "article",
        isSolved: solvedIds.includes(a.id),
      })),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getArticleById = async (req, res) => {
  try {
    const article = await Article.findById(req.params.id);
    if (!article)
      return res
        .status(404)
        .json({ success: false, message: "Article not found" });

    article.type = "article";

    // Attach isSolved for students
    if (req.user && req.user.role === "student") {
      const progressRecords = await Progress.findAllByStudent(req.user.userId);
      const record = progressRecords.find(
        (p) =>
          p.articleId === article.id ||
          (p.contentId === article.id && p.contentType === "article"),
      );
      article.isSolved = record?.status === "completed" || false;
    }

    res.json({ success: true, article, problem: article });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateArticle = async (req, res) => {
  try {
    const article = await Article.update(req.params.id, req.body);
    if (!article)
      return res
        .status(404)
        .json({ success: false, message: "Article not found" });
    res.json({ success: true, article });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteArticle = async (req, res) => {
  try {
    const article = await Article.delete(req.params.id);
    if (!article)
      return res
        .status(404)
        .json({ success: false, message: "Article not found" });
    res.json({ success: true, message: "Article deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const bulkDeleteArticles = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids)) {
      return res.status(400).json({ success: false, message: "IDs required" });
    }
    for (const id of ids) {
      await Article.delete(id);
    }
    res.json({ success: true, message: `${ids.length} articles deleted` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createArticle,
  getAllArticles,
  getArticleById,
  updateArticle,
  deleteArticle,
  bulkDeleteArticles,
};
