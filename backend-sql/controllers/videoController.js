const Video = require("../models/Video");
const Progress = require("../models/Progress");
const prisma = require("../config/db");

const createVideo = async (req, res) => {
  try {
    const video = await Video.create({
      ...req.body,
      createdBy: req.user.userId,
    });
    res.status(201).json({ success: true, video });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getAllVideos = async (req, res) => {
  try {
    const videos = await Video.findAll();
    let solvedIds = [];
    if (req.user?.role === "student") {
      const progress = await Progress.findAllByStudent(req.user.userId);
      solvedIds = progress
        .filter((p) => p.status === "completed" && p.videoId)
        .map((p) => p.videoId);
    }
    res.json({
      success: true,
      videos: videos.map((v) => ({
        ...v,
        _id: v.id,
        type: "video",
        isSolved: solvedIds.includes(v.id),
      })),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getVideoById = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video)
      return res
        .status(404)
        .json({ success: false, message: "Video not found" });

    video.type = "video";

    // Attach isSolved and savedAnswers for students
    if (req.user && req.user.role === "student") {
      const progressRecords = await Progress.findAllByStudent(req.user.userId);
      const record = progressRecords.find(
        (p) =>
          p.videoId === video.id ||
          (p.contentId === video.id && p.contentType === "video"),
      );
      video.isSolved = record?.status === "completed" || false;

      if (video.isSolved) {
        try {
          const sub = await prisma.submission.findFirst({
            where: {
              studentId: req.user.userId,
              videoId: video.id,
              language: "json",
            },
            orderBy: { createdAt: "desc" },
          });
          if (sub && sub.code) {
            try {
              video.savedAnswers = JSON.parse(sub.code);
            } catch (e) {}
          }
        } catch (e) {}
      }
    }

    res.json({ success: true, video, problem: video });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateVideo = async (req, res) => {
  try {
    const video = await Video.update(req.params.id, req.body);
    if (!video)
      return res
        .status(404)
        .json({ success: false, message: "Video not found" });
    res.json({ success: true, video });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteVideo = async (req, res) => {
  try {
    const video = await Video.delete(req.params.id);
    if (!video)
      return res
        .status(404)
        .json({ success: false, message: "Video not found" });
    res.json({ success: true, message: "Video deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const bulkDeleteVideos = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids)) {
      return res.status(400).json({ success: false, message: "IDs required" });
    }
    for (const id of ids) {
      await Video.delete(id);
    }
    res.json({ success: true, message: `${ids.length} videos deleted` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createVideo,
  getAllVideos,
  getVideoById,
  updateVideo,
  deleteVideo,
  bulkDeleteVideos,
};
