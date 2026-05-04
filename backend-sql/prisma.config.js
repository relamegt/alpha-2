const { defineConfig } = require('@prisma/config');
const dotenv = require('dotenv');

dotenv.config();

module.exports = defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
