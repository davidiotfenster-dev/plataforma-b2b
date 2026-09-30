-- CreateEnum
CREATE TYPE "TipoEmpresa" AS ENUM ('PARTNER', 'CLIENTE');

-- CreateEnum
CREATE TYPE "MarcaCatalogo" AS ENUM ('VBH', 'PROCOMSA', 'MYSMARTWINDOW');

-- AlterTable
ALTER TABLE "Partner" ADD COLUMN     "marcaCatalogo" "MarcaCatalogo" NOT NULL DEFAULT 'MYSMARTWINDOW',
ADD COLUMN     "tipo" "TipoEmpresa" NOT NULL DEFAULT 'CLIENTE';

-- CreateIndex
CREATE INDEX "Partner_tipo_idx" ON "Partner"("tipo");
