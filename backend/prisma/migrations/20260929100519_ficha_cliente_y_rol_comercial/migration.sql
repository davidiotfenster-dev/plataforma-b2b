-- AlterEnum
ALTER TYPE "RolUsuario" ADD VALUE 'COMERCIAL';

-- AlterTable
ALTER TABLE "Partner" ADD COLUMN     "codigoPostal" TEXT,
ADD COLUMN     "codigoPostalEnvio" TEXT,
ADD COLUMN     "correoContacto1" TEXT,
ADD COLUMN     "correoContacto2" TEXT,
ADD COLUMN     "correoFacturacion" TEXT,
ADD COLUMN     "creadoPorUsuarioId" UUID,
ADD COLUMN     "direccionEnvioDefecto" TEXT,
ADD COLUMN     "divisa" TEXT,
ADD COLUMN     "formaPago" TEXT,
ADD COLUMN     "iva" DECIMAL(5,2),
ADD COLUMN     "localidad" TEXT,
ADD COLUMN     "localidadEnvio" TEXT,
ADD COLUMN     "paisEnvio" TEXT,
ADD COLUMN     "provincia" TEXT,
ADD COLUMN     "provinciaEnvio" TEXT,
ADD COLUMN     "telefono1" TEXT,
ADD COLUMN     "telefono2" TEXT;

-- CreateIndex
CREATE INDEX "Partner_creadoPorUsuarioId_idx" ON "Partner"("creadoPorUsuarioId");

-- AddForeignKey
ALTER TABLE "Partner" ADD CONSTRAINT "Partner_creadoPorUsuarioId_fkey" FOREIGN KEY ("creadoPorUsuarioId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

