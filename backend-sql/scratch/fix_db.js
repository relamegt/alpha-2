const { Pool } = require('pg');
require('dotenv').config();

const dbUrl = process.env.DATABASE_URL?.trim() || 'postgresql://postgres:Akash__9963@db.scgfcthzllgqyhntgupw.supabase.co:5432/postgres';

const pool = new Pool({ connectionString: dbUrl });

async function fix() {
    try {
        console.log('Checking for column...');
        const res = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='courses' AND column_name='whatYouWillLearn'
        `);
        
        if (res.rowCount === 0) {
            console.log('Column missing. Adding it...');
            await pool.query('ALTER TABLE courses ADD COLUMN "whatYouWillLearn" TEXT DEFAULT \'\'');
            console.log('Column added successfully.');
        } else {
            console.log('Column already exists.');
        }
        
        // Also check for other columns that might be missing based on schema
        // hours, language
        const res2 = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='courses' AND column_name='hours'
        `);
        if (res2.rowCount === 0) {
            console.log('Column hours missing. Adding it...');
            await pool.query('ALTER TABLE courses ADD COLUMN "hours" DOUBLE PRECISION DEFAULT 0');
        }

        const res3 = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='courses' AND column_name='language'
        `);
        if (res3.rowCount === 0) {
            console.log('Column language missing. Adding it...');
            await pool.query('ALTER TABLE courses ADD COLUMN "language" TEXT DEFAULT \'English\'');
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

fix();
