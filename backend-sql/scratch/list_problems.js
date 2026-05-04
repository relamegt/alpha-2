const { Pool } = require('pg');
require('dotenv').config();

const dbUrl = process.env.DATABASE_URL?.trim() || 'postgresql://postgres:Akash__9963@db.scgfcthzllgqyhntgupw.supabase.co:5432/postgres';
const pool = new Pool({ connectionString: dbUrl });

async function listProblems() {
    try {
        const res = await pool.query('SELECT title, difficulty, points FROM problems LIMIT 20');
        console.log('Problems:', JSON.stringify(res.rows, null, 2));
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

listProblems();
