const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const dbUrl = process.env.DATABASE_URL?.trim() || 'postgresql://postgres:Akash__9963@db.scgfcthzllgqyhntgupw.supabase.co:5432/postgres';

const pool = new Pool({ connectionString: dbUrl });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
}).$extends({
  result: {
    $allModels: {
      _id: {
        needs: { id: true },
        compute(model) {
          return model.id;
        },
      },
    },
  },
});

module.exports = prisma;
