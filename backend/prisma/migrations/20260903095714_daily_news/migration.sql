-- CreateTable
CREATE TABLE "daily_news" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "quote" JSONB,
    "indices" JSONB NOT NULL,
    "sections" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_news_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "daily_news_date_key" ON "daily_news"("date");
