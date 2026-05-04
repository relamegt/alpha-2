const Announcement = require('../models/Announcement');

const announcementController = {
  // Create announcement
  create: async (req, res, next) => {
    try {
      const { title, content, type, priority, links, readTime } = req.body;
      const announcement = await Announcement.create({
        title,
        content,
        type,
        priority,
        author: req.user.firstName + ' ' + (req.user.lastName || ''),
        links,
        readTime,
        createdBy: req.user.userId
      });
      res.status(201).json(announcement);
    } catch (error) {
      next(error);
    }
  },

  // Get announcements with read status
  getAllWithReadStatus: async (req, res, next) => {
    try {
      const announcements = await Announcement.findAllActive();
      
      // Need a way to check if user has read them
      // This part might still need direct prisma or helper from some user model
      const User = require('../models/User');
      const user = await User.findById(req.user.userId);
      const lastCheck = user?.lastAnnouncementCheck || new Date(0);
      
      const announcementsWithStatus = announcements.map(announcement => ({
        ...announcement,
        isRead: new Date(announcement.createdAt) <= lastCheck
      }));

      res.json(announcementsWithStatus);
    } catch (error) {
      next(error);
    }
  },

  // Mark as read (optionally a specific one, but currently marks all due to timestamp-based system)
  markAsRead: async (req, res, next) => {
    try {
      const { id } = req.params;
      await Announcement.markAllAsRead(req.user.userId);
      res.json({ 
        success: true, 
        message: id ? `Announcement ${id} marked as read` : 'All announcements marked as read' 
      });
    } catch (error) {
      next(error);
    }
  },

  // Get unread count
  getUnreadCount: async (req, res, next) => {
    try {
      const unreadCount = await Announcement.getUnreadCount(req.user.userId);
      res.json({ unreadCount });
    } catch (error) {
      next(error);
    }
  },

  // Update announcement
  update: async (req, res, next) => {
    try {
      const { announcementId } = req.params;
      const announcement = await Announcement.update(announcementId, req.body);
      res.json(announcement);
    } catch (error) {
      next(error);
    }
  },

  // Delete announcement
  delete: async (req, res, next) => {
    try {
      const { announcementId } = req.params;
      await Announcement.delete(announcementId);
      res.json({ success: true, message: 'Announcement deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = announcementController;
