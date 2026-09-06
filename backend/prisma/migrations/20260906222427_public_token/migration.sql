-- AlterTable
ALTER TABLE "users" ADD COLUMN "publicToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_publicToken_key" ON "users"("publicToken");
