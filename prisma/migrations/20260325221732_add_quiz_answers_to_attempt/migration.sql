-- AlterTable
ALTER TABLE "attempts" ADD COLUMN     "correctAnswers" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalAnswers" INTEGER NOT NULL DEFAULT 0;
