-- CreateTable
CREATE TABLE "interview_sessions" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "companyName" TEXT,
    "website" TEXT,
    "jobDescription" TEXT,
    "interviewType" TEXT NOT NULL DEFAULT 'HR',
    "difficulty" TEXT NOT NULL DEFAULT 'Medium',
    "plannedDuration" INTEGER NOT NULL DEFAULT 30,
    "voiceName" TEXT DEFAULT 'Puck',
    "resumeUrl" TEXT,
    "resumeText" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "transcript" JSONB,
    "debrief" JSONB,
    "feedbackSummary" TEXT,
    "score" INTEGER,
    "durationSeconds" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "interview_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "interview_sessions_studentId_idx" ON "interview_sessions"("studentId");

-- AddForeignKey
ALTER TABLE "interview_sessions" ADD CONSTRAINT "interview_sessions_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
