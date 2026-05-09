const prisma = require('./backend-sql/config/db');
console.log('subscriptionPlan:', !!prisma.subscriptionPlan);
console.log('subscriptionPlan.findMany:', prisma.subscriptionPlan ? !!prisma.subscriptionPlan.findMany : 'N/A');
console.log('saleBanner:', !!prisma.saleBanner);
console.log('saleBanner.findFirst:', prisma.saleBanner ? !!prisma.saleBanner.findFirst : 'N/A');
process.exit(0);
