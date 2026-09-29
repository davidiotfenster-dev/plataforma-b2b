-- AlterTable
ALTER TABLE "User" ADD COLUMN     "tokenResetPassword" TEXT,
ADD COLUMN     "tokenResetPasswordExpira" TIMESTAMP(3),
ADD COLUMN     "sesionInvalidadaEn" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "User_tokenResetPassword_key" ON "User"("tokenResetPassword");
