-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "role" TEXT NOT NULL,
    "batchId" TEXT,
    "registeredForContest" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isFirstLogin" BOOLEAN NOT NULL DEFAULT true,
    "profileCompleted" BOOLEAN NOT NULL DEFAULT false,
    "isPublicProfile" BOOLEAN NOT NULL DEFAULT true,
    "activeSessionToken" TEXT,
    "deviceFingerprint" TEXT,
    "profile" JSONB,
    "education" JSONB,
    "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "tokenVersion" INTEGER NOT NULL DEFAULT 0,
    "alphacoins" INTEGER NOT NULL DEFAULT 0,
    "lastLogin" TIMESTAMP(3),
    "lastCoinUpdate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "batches" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "deleteOn" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "description" TEXT NOT NULL DEFAULT '',
    "studentCount" INTEGER NOT NULL DEFAULT 0,
    "education" JSONB,
    "branches" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "assignedCourses" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "problems" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "section" TEXT,
    "type" TEXT NOT NULL DEFAULT 'problem',
    "quizQuestions" JSONB,
    "difficulty" TEXT NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 10,
    "description" TEXT NOT NULL,
    "constraints" JSONB,
    "inputFormat" TEXT,
    "outputFormat" TEXT,
    "edgeCases" JSONB,
    "examples" JSONB,
    "testCases" JSONB,
    "timeComplexity" TEXT,
    "spaceComplexity" TEXT,
    "timeLimit" INTEGER NOT NULL DEFAULT 2000,
    "editorial" JSONB,
    "editorialLink" TEXT,
    "videoUrl" TEXT,
    "lectureSummary" TEXT,
    "lectureSummaryLink" TEXT,
    "resources" JSONB,
    "solutionCode" JSONB,
    "isContestProblem" BOOLEAN NOT NULL DEFAULT false,
    "contestId" TEXT,
    "supported_dbs" TEXT[],
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "problems_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "submissions" (
    "id" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "verdict" TEXT NOT NULL,
    "executionTime" DOUBLE PRECISION,
    "memoryUsed" DOUBLE PRECISION,
    "points" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "progress" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "lastAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "external_profiles" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "stats" JSONB,
    "lastSyncAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "external_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contests" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "batchId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'upcoming',
    "rules" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contest_submissions" (
    "id" TEXT NOT NULL,
    "contestId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "verdict" TEXT NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,
    "executionTime" DOUBLE PRECISION,
    "memoryUsed" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contest_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courses" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "thumbnailUrl" TEXT,
    "sections" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leaderboard" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "problemId" TEXT,
    "points" INTEGER NOT NULL DEFAULT 0,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leaderboard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_InstructorBatches" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_InstructorBatches_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "batches_slug_key" ON "batches"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "problems_slug_key" ON "problems"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "progress_studentId_problemId_key" ON "progress"("studentId", "problemId");

-- CreateIndex
CREATE UNIQUE INDEX "external_profiles_studentId_platform_key" ON "external_profiles"("studentId", "platform");

-- CreateIndex
CREATE UNIQUE INDEX "contests_slug_key" ON "contests"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "courses_slug_key" ON "courses"("slug");

-- CreateIndex
CREATE INDEX "_InstructorBatches_B_index" ON "_InstructorBatches"("B");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "problems" ADD CONSTRAINT "problems_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "contests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "problems"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "progress" ADD CONSTRAINT "progress_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "progress" ADD CONSTRAINT "progress_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "problems"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_profiles" ADD CONSTRAINT "external_profiles_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contests" ADD CONSTRAINT "contests_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contest_submissions" ADD CONSTRAINT "contest_submissions_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "contests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contest_submissions" ADD CONSTRAINT "contest_submissions_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leaderboard" ADD CONSTRAINT "leaderboard_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leaderboard" ADD CONSTRAINT "leaderboard_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "problems"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_InstructorBatches" ADD CONSTRAINT "_InstructorBatches_A_fkey" FOREIGN KEY ("A") REFERENCES "batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_InstructorBatches" ADD CONSTRAINT "_InstructorBatches_B_fkey" FOREIGN KEY ("B") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
