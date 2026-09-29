-- CreateEnum
CREATE TYPE "Idioma" AS ENUM ('ES', 'EN', 'DE', 'IT', 'PT');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "idioma" "Idioma" NOT NULL DEFAULT 'ES';
