const PublicArticle = require("../models/PublicArticle");

const getAllArticles = async (req, res) => {
  try {
    const { category, search } = req.query;
    const userId = req.user?.userId;
    const articles = await PublicArticle.findAll({ category, search }, userId);
    res.json({ success: true, articles });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getArticleBySlug = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const article = await PublicArticle.findBySlug(req.params.slug, userId);
    if (!article) {
      return res.status(404).json({ success: false, message: "Article not found" });
    }
    res.json({ success: true, article });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getCategories = async (req, res) => {
  try {
    const categories = await PublicArticle.getCategories();
    res.json({ success: true, categories });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const toggleSaveArticle = async (req, res) => {
  try {
    const { articleId } = req.params;
    const result = await PublicArticle.toggleSave(req.user.userId, articleId);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getSavedArticles = async (req, res) => {
  try {
    const articles = await PublicArticle.getSaved(req.user.userId);
    res.json({ success: true, articles });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Admin actions
const createArticle = async (req, res) => {
  try {
    const article = await PublicArticle.create({
      ...req.body,
      authorId: req.user.userId,
    });
    res.status(201).json({ success: true, article });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateArticle = async (req, res) => {
  try {
    const article = await PublicArticle.update(req.params.id, req.body);
    res.json({ success: true, article });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getRecentArticles = async (req, res) => {
  try {
    const articles = await PublicArticle.findAll({ limit: 5 });
    res.json({ success: true, articles });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteArticle = async (req, res) => {
  try {
    await PublicArticle.delete(req.params.id);
    res.json({ success: true, message: "Article deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getAllArticles,
  getArticleBySlug,
  getCategories,
  toggleSaveArticle,
  getSavedArticles,
  getRecentArticles,
  createArticle,
  updateArticle,
  deleteArticle,
};
