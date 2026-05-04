const prisma = require('../config/db');

class Sheet {
  // Get all sheets with sections and subsections
  static async findAll() {
    try {
      // Step 1: Attempt raw query to bypass Prisma model validation entirely
      // This allows us to fetch whatever columns EXIST in the table without crashing on missing 'slug'
      const rawSheets = await prisma.$queryRawUnsafe('SELECT * FROM sheets');
      
      if (!rawSheets || rawSheets.length === 0) return [];

      // Step 2: Manually fetch sections if they exist
      try {
          const sections = await prisma.sheetSection.findMany({
              include: {
                  subsections: {
                      include: {
                          problems: true
                      }
                  }
              }
          });

          // Group sections by sheetId
          const sectionsMap = {};
          sections.forEach(sec => {
              if (!sectionsMap[sec.sheetId]) sectionsMap[sec.sheetId] = [];
              sectionsMap[sec.sheetId].push(sec);
          });

          // Attach sections to sheets
          return rawSheets.map(s => ({
              ...s,
              sections: sectionsMap[s.id] || []
          })).sort((a, b) => {
              const dateA = a.created_at || a.createdAt ? new Date(a.created_at || a.createdAt) : new Date(0);
              const dateB = b.created_at || b.createdAt ? new Date(b.created_at || b.createdAt) : new Date(0);
              return dateA - dateB;
          });
      } catch (secError) {
          console.warn("Could not fetch sections via relations:", secError.message);
          return rawSheets.map(s => ({ ...s, sections: [] }));
      }

    } catch (error) {
      console.error("Critical Database Error in Sheet.findAll:", error.message);
      // Final emergency fallback to keep server alive
      return []; 
    }
  }

  // Find sheet by ID or Slug
  static async findById(sheetIdOrSlug) {
    // Try UUID first if it looks like one, otherwise try slug
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sheetIdOrSlug);
    
    try {
      return await prisma.sheet.findFirst({
        where: isUuid 
          ? { OR: [{ id: sheetIdOrSlug }, { slug: sheetIdOrSlug }] }
          : { slug: sheetIdOrSlug },
        include: {
          sections: {
            orderBy: { order: 'asc' },
            include: {
              subsections: {
                orderBy: { order: 'asc' },
                include: {
                  problems: {
                      orderBy: { createdAt: 'asc' }
                  }
                }
              }
            }
          }
        }
      });
    } catch (error) {
      // If error is about missing slug column, fallback to ID only
      if (error.message.includes('slug') || error.code === 'P2022') {
        console.warn("Slug column missing in sheets table, falling back to ID-only search");
        if (!isUuid) return null; // Can't search by slug if column is missing

        return await prisma.sheet.findFirst({
          where: { id: sheetIdOrSlug },
          select: {
            id: true,
            name: true,
            description: true,
            createdAt: true,
            updatedAt: true,
            createdBy: true,
            sections: {
              orderBy: { order: 'asc' },
              include: {
                subsections: {
                  orderBy: { order: 'asc' },
                  include: {
                    problems: {
                        orderBy: { createdAt: 'asc' }
                    }
                  }
                }
              }
            }
          }
        });
      }
      throw error;
    }
  }

  // Create sheet
  static async create(data) {
    const slug = data.slug || data.name.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    try {
      return await prisma.sheet.create({
        data: {
          name: data.name,
          slug: slug,
          description: data.description || "",
          createdBy: data.createdBy
        }
      });
    } catch (error) {
      if (error.message.includes('slug') || error.code === 'P2022') {
        console.warn("Slug column missing in sheets table, creating without slug");
        return await prisma.sheet.create({
          data: {
            name: data.name,
            description: data.description || "",
            createdBy: data.createdBy
          },
          select: {
            id: true,
            name: true,
            description: true,
            createdAt: true,
            updatedAt: true,
            createdBy: true
          }
        });
      }
      throw error;
    }
  }

  // Update sheet
  static async update(id, data) {
    try {
      return await prisma.sheet.update({
        where: { id },
        data
      });
    } catch (error) {
      if ((error.message.includes('slug') || error.code === 'P2022') && data.slug) {
        console.warn("Slug column missing in sheets table, updating without slug");
        const { slug, ...updateData } = data;
        return await prisma.sheet.update({
          where: { id },
          data: updateData,
          select: {
            id: true,
            name: true,
            description: true,
            createdAt: true,
            updatedAt: true,
            createdBy: true
          }
        });
      }
      throw error;
    }
  }

  // Delete sheet
  static async delete(id) {
    return await prisma.sheet.delete({
      where: { id }
    });
  }

  // Section Management
  static async addSection(sheetId, data) {
    return await prisma.sheetSection.create({
      data: {
        sheetId,
        name: data.name,
        description: data.description || "",
        order: data.order || 0
      }
    });
  }

  static async updateSection(sectionId, data) {
    return await prisma.sheetSection.update({
      where: { id: sectionId },
      data
    });
  }

  static async deleteSection(sectionId) {
    return await prisma.sheetSection.delete({
      where: { id: sectionId }
    });
  }

  // Subsection Management
  static async addSubsection(sectionId, data) {
    return await prisma.sheetSubsection.create({
      data: {
        sectionId,
        name: data.name,
        description: data.description || "",
        order: data.order || 0
      }
    });
  }

  static async updateSubsection(subsectionId, data) {
    return await prisma.sheetSubsection.update({
      where: { id: subsectionId },
      data
    });
  }

  static async deleteSubsection(subsectionId) {
    return await prisma.sheetSubsection.delete({
      where: { id: subsectionId }
    });
  }
}

module.exports = Sheet;
