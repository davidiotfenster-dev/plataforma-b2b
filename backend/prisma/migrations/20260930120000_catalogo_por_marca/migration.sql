-- AlterTable
ALTER TABLE "RepresentacionPartner" ADD COLUMN     "productoMarcaId" UUID;

-- CreateTable
CREATE TABLE "ProductoMarca" (
    "id" UUID NOT NULL,
    "marca" "MarcaCatalogo" NOT NULL,
    "productoBaseId" UUID NOT NULL,
    "skuComercial" TEXT NOT NULL,
    "nombreComercial" TEXT NOT NULL,
    "documentacionUrl" TEXT,
    "pvpBase" DECIMAL(12,2) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductoMarca_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductoMarca_marca_productoBaseId_key" ON "ProductoMarca"("marca", "productoBaseId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductoMarca_marca_skuComercial_key" ON "ProductoMarca"("marca", "skuComercial");

-- CreateIndex
CREATE UNIQUE INDEX "RepresentacionPartner_partnerId_productoMarcaId_key" ON "RepresentacionPartner"("partnerId", "productoMarcaId");

-- AddForeignKey
ALTER TABLE "ProductoMarca" ADD CONSTRAINT "ProductoMarca_productoBaseId_fkey" FOREIGN KEY ("productoBaseId") REFERENCES "ProductoBase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepresentacionPartner" ADD CONSTRAINT "RepresentacionPartner_productoMarcaId_fkey" FOREIGN KEY ("productoMarcaId") REFERENCES "ProductoMarca"("id") ON DELETE CASCADE ON UPDATE CASCADE;

