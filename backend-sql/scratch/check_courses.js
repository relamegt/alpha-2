const prisma = require('../config/db');

async function main() {
    try {
        const courses = await prisma.course.findMany();
        console.log('All Courses:', JSON.stringify(courses, null, 2));
        
        const publishedCourses = await prisma.course.findMany({ where: { isPublished: true } });
        console.log('Published Courses:', JSON.stringify(publishedCourses, null, 2));
    } catch (err) {
        console.error('Database query error:', err);
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
