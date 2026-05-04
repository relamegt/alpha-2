require('dotenv').config();
const { Pool } = require('pg');

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  // 1) Add missing columns (safe if they already exist)
  await pool.query(`
    ALTER TABLE "interview_sessions"
      ADD COLUMN IF NOT EXISTS "companyName" TEXT,
      ADD COLUMN IF NOT EXISTS "website" TEXT,
      ADD COLUMN IF NOT EXISTS "jobDescription" TEXT,
      ADD COLUMN IF NOT EXISTS "interviewType" TEXT NOT NULL DEFAULT 'HR',
      ADD COLUMN IF NOT EXISTS "difficulty" TEXT NOT NULL DEFAULT 'Medium',
      ADD COLUMN IF NOT EXISTS "plannedDuration" INTEGER NOT NULL DEFAULT 30,
      ADD COLUMN IF NOT EXISTS "voiceName" TEXT DEFAULT 'Puck',
      ADD COLUMN IF NOT EXISTS "resumeUrl" TEXT,
      ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'pending',
      ADD COLUMN IF NOT EXISTS "debrief" JSONB,
      ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3)
  `);

  // 2) transcript: legacy column is TEXT; new schema expects JSONB.
  // If legacy data exists, it is likely not valid JSON; null it out to avoid type cast failures.
  await pool.query(`UPDATE "interview_sessions" SET "transcript" = NULL WHERE "transcript" IS NOT NULL`);
  await pool.query(`
    ALTER TABLE "interview_sessions"
      ALTER COLUMN "transcript" TYPE JSONB
      USING NULL
  `);

  // 3) Ensure updatedAt is filled + not null
  await pool.query(`UPDATE "interview_sessions" SET "updatedAt" = COALESCE("updatedAt", NOW())`);
  await pool.query(`ALTER TABLE "interview_sessions" ALTER COLUMN "updatedAt" SET NOT NULL`);

  // 4) Ensure createdAt matches Prisma naming (if it exists it's fine). Nothing to do.
  // 5) Index + FK (safe)
  await pool.query(`CREATE INDEX IF NOT EXISTS "interview_sessions_studentId_idx" ON "interview_sessions"("studentId")`);
  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'interview_sessions_studentId_fkey'
      ) THEN
        ALTER TABLE "interview_sessions"
          ADD CONSTRAINT "interview_sessions_studentId_fkey"
          FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
    END $$;
  `);

  console.log('✅ interview_sessions hotfix applied');
  await pool.end();
}

main().catch((e) => {
  console.error('❌ hotfix failed:', e);
  process.exit(1);
});

