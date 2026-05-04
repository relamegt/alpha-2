const bcrypt = require('bcryptjs');
const prisma = require('./config/db');

const seedAdmin = async () => {
  try {
    const adminEmail = 'alpha@gmail.com';
    const adminPassword = 'admin123';

    console.log(`[Seed] Checking for existing admin: ${adminEmail}`);

    const existingAdmin = await prisma.user.findUnique({
      where: { email: adminEmail }
    });

    if (existingAdmin) {
      console.log('✅ Admin already exists.');
    } else {
      console.log('🚀 Creating new admin user...');
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      await prisma.user.create({
        data: {
          email: adminEmail,
          password: hashedPassword,
          role: 'admin',
          firstName: 'System',
          lastName: 'Admin'
        }
      });
      console.log('✅ Admin user created successfully!');
    }
  } catch (error) {
    console.error('❌ Seeding failed:', error);
  } finally {
    await prisma.$disconnect();
    process.exit();
  }
};

seedAdmin();
