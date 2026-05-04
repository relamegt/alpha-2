const prisma = require('../config/db');

class Announcement {
  // Create new announcement
  static async create(data) {
    return await prisma.announcement.create({
      data: {
        title: data.title,
        content: data.content,
        type: data.type || 'info',
        priority: data.priority || 'medium',
        author: data.author || 'Admin',
        links: data.links || [],
        readTime: data.readTime || '2 min read',
        createdBy: data.createdBy
      }
    });
  }

  // Find all active announcements
  static async findAllActive() {
    return await prisma.announcement.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' }
    });
  }

  // Get unread count for a specific user based on their last check date
  static async getUnreadCount(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { lastAnnouncementCheck: true }
    });

    const lastCheck = user?.lastAnnouncementCheck || new Date(0);

    return await prisma.announcement.count({
      where: {
        isActive: true,
        createdAt: { gt: lastCheck }
      }
    });
  }

  // Mark all announcements as read for a user
  static async markAllAsRead(userId) {
    return await prisma.user.update({
      where: { id: userId },
      data: { lastAnnouncementCheck: new Date() }
    });
  }

  // Update announcement
  static async update(id, data) {
    return await prisma.announcement.update({
      where: { id },
      data
    });
  }

  // Delete announcement
  static async delete(id) {
    return await prisma.announcement.delete({
      where: { id }
    });
  }
}

module.exports = Announcement;
