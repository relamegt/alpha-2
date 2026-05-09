const prisma = require('./backend-sql/config/db');
console.log('Available models:', Object.keys(prisma).filter(k => !k.startsWith('_') && !k.startsWith('$')));
process.exit(0);
