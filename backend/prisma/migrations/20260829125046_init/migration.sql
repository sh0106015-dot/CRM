-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateEnum
CREATE TYPE "CustomerGrade" AS ENUM ('NEW', 'GENERAL', 'LONGTERM', 'VIP', 'POTENTIAL');

-- CreateEnum
CREATE TYPE "ConsultStatus" AS ENUM ('NONE', 'IN_PROGRESS', 'SCHEDULED', 'DONE');

-- CreateEnum
CREATE TYPE "ScheduleType" AS ENUM ('CONTACT', 'PHONE_CONSULT', 'VISIT_CONSULT', 'CONTRACT', 'RENEWAL', 'ANNIVERSARY', 'ETC');

-- CreateEnum
CREATE TYPE "ScheduleStatus" AS ENUM ('PENDING', 'DONE', 'CANCELED');

-- CreateEnum
CREATE TYPE "RecommendationPriority" AS ENUM ('IMMEDIATE', 'TODAY', 'THIS_WEEK', 'NORMAL');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "passwordHash" TEXT,
    "occupation" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'local',
    "providerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "customerNo" TEXT,
    "birthDate" TIMESTAMP(3),
    "gender" "Gender",
    "occupation" TEXT,
    "address" TEXT,
    "notes" TEXT,
    "grade" "CustomerGrade" NOT NULL DEFAULT 'GENERAL',
    "interests" TEXT[],
    "consultStatus" "ConsultStatus" NOT NULL DEFAULT 'NONE',
    "lastContactAt" TIMESTAMP(3),
    "nextContactAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_tags" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consultations" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "consultationDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "content" TEXT NOT NULL,
    "summary" TEXT,
    "nextAction" TEXT,
    "nextContactDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consultations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schedules" (
    "id" TEXT NOT NULL,
    "customerId" TEXT,
    "userId" TEXT,
    "title" TEXT NOT NULL,
    "scheduleDate" TIMESTAMP(3) NOT NULL,
    "type" "ScheduleType" NOT NULL DEFAULT 'CONTACT',
    "status" "ScheduleStatus" NOT NULL DEFAULT 'PENDING',
    "memo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_recommendations" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "priority" "RecommendationPriority" NOT NULL,
    "reason" TEXT NOT NULL,
    "recommendation" TEXT NOT NULL,
    "recommendedChannel" TEXT,
    "recommendedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_generated_messages" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "tone" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_generated_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_provider_providerId_idx" ON "users"("provider", "providerId");

-- CreateIndex
CREATE INDEX "customers_userId_idx" ON "customers"("userId");

-- CreateIndex
CREATE INDEX "customers_userId_name_idx" ON "customers"("userId", "name");

-- CreateIndex
CREATE INDEX "customers_userId_phone_idx" ON "customers"("userId", "phone");

-- CreateIndex
CREATE INDEX "customers_userId_lastContactAt_idx" ON "customers"("userId", "lastContactAt");

-- CreateIndex
CREATE INDEX "customers_userId_nextContactAt_idx" ON "customers"("userId", "nextContactAt");

-- CreateIndex
CREATE INDEX "customer_tags_tag_idx" ON "customer_tags"("tag");

-- CreateIndex
CREATE UNIQUE INDEX "customer_tags_customerId_tag_key" ON "customer_tags"("customerId", "tag");

-- CreateIndex
CREATE INDEX "consultations_customerId_consultationDate_idx" ON "consultations"("customerId", "consultationDate");

-- CreateIndex
CREATE INDEX "schedules_userId_scheduleDate_idx" ON "schedules"("userId", "scheduleDate");

-- CreateIndex
CREATE INDEX "schedules_customerId_scheduleDate_idx" ON "schedules"("customerId", "scheduleDate");

-- CreateIndex
CREATE INDEX "schedules_status_idx" ON "schedules"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ai_recommendations_customerId_key" ON "ai_recommendations"("customerId");

-- CreateIndex
CREATE INDEX "ai_recommendations_priority_idx" ON "ai_recommendations"("priority");

-- CreateIndex
CREATE INDEX "ai_recommendations_score_idx" ON "ai_recommendations"("score");

-- CreateIndex
CREATE INDEX "ai_generated_messages_customerId_createdAt_idx" ON "ai_generated_messages"("customerId", "createdAt");

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_tags" ADD CONSTRAINT "customer_tags_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultations" ADD CONSTRAINT "consultations_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_recommendations" ADD CONSTRAINT "ai_recommendations_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_generated_messages" ADD CONSTRAINT "ai_generated_messages_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
