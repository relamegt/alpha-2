const prisma = require('./config/db');

async function check() {
    try {
        const res = await prisma.$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`;
        console.log("Tables:");
        res.forEach(r => console.log(r.table_name));
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}
check();
