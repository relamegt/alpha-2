const { Pool } = require('pg');
require('dotenv').config();

const dbUrl = process.env.DATABASE_URL?.trim() || 'postgresql://postgres:Akash__9963@db.scgfcthzllgqyhntgupw.supabase.co:5432/postgres';

const pool = new Pool({ connectionString: dbUrl });

async function checkMore() {
    try {
        const tables = ['announcements', 'users', 'problems'];
        for (const table of tables) {
            console.log(`Checking table: ${table}`);
            const res = await pool.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name=$1
            `, [table]);
            console.log(`Columns in ${table}:`, res.rows.map(r => r.column_name).join(', '));
        }
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

checkMore();
