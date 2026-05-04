const { Pool } = require('pg');
require('dotenv').config();

const dbUrl = process.env.DATABASE_URL?.trim() || 'postgresql://postgres:Akash__9963@db.scgfcthzllgqyhntgupw.supabase.co:5432/postgres';
const pool = new Pool({ connectionString: dbUrl });

async function checkUsers() {
    try {
        const res = await pool.query('SELECT id, email, role, "batchId" FROM users LIMIT 10');
        console.log('Users:', JSON.stringify(res.rows, null, 2));
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

checkUsers();
