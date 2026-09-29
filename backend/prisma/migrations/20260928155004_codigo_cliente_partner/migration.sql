-- AlterTable
ALTER TABLE "Partner" ADD COLUMN     "codigoCliente" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Partner_codigoCliente_key" ON "Partner"("codigoCliente");
