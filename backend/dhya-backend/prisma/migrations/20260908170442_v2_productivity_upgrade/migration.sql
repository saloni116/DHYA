-- CreateEnum
CREATE TYPE "public"."Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "public"."TaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "public"."SessionStatus" AS ENUM ('COMPLETED', 'ABANDONED', 'CANCELLED');

-- AlterTable
ALTER TABLE "public"."FocusSession" ADD COLUMN     "status" "public"."SessionStatus" NOT NULL DEFAULT 'COMPLETED';

-- AlterTable
ALTER TABLE "public"."Task" ADD COLUMN     "priority" "public"."Priority" NOT NULL DEFAULT 'MEDIUM',
ADD COLUMN     "status" "public"."TaskStatus" NOT NULL DEFAULT 'TODO',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
