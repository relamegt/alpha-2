require('dotenv').config();
const { Pool } = require('pg');

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const sql =
    "select column_name, data_type, is_nullable from information_schema.columns where table_schema='public' and table_name='interview_sessions' order by ordinal_position";
  const r = await pool.query(sql);
  console.log(JSON.stringify(r.rows, null, 2));
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

