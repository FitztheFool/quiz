-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('PENDING', 'ACTIVE', 'DEACTIVATED', 'BANNED');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'GUEST';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "activatedAt" TIMESTAMP(3),
ADD COLUMN     "status" "UserStatus" NOT NULL DEFAULT 'PENDING';
