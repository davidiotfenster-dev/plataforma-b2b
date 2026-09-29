-- CreateEnum
CREATE TYPE "RolUsuario" AS ENUM ('ADMIN_FENSTER', 'PARTNER_ADMIN', 'PARTNER_COMPRADOR', 'PARTNER_CONSULTA');

-- CreateEnum
CREATE TYPE "EstadoPartner" AS ENUM ('PENDIENTE_VERIFICACION_EMAIL', 'PENDIENTE_APROBACION', 'ACTIVO', 'SUSPENDIDO', 'RECHAZADO');

-- CreateEnum
CREATE TYPE "EstadoPedido" AS ENUM ('RECIBIDO', 'CONFIRMADO', 'EN_PREPARACION', 'PREPARADO', 'ENVIADO');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "rol" "RolUsuario" NOT NULL,
    "partnerId" UUID,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "emailVerificadoEn" TIMESTAMP(3),
    "tokenVerificacion" TEXT,
    "tokenVerificacionExpira" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Partner" (
    "id" UUID NOT NULL,
    "razonSocial" TEXT NOT NULL,
    "cif" TEXT NOT NULL,
    "direccionFiscal" TEXT NOT NULL,
    "pais" TEXT NOT NULL,
    "dominioWeb" TEXT NOT NULL,
    "marcaComercial" TEXT,
    "tarifa" TEXT,
    "descuentoPorcentaje" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "estado" "EstadoPartner" NOT NULL DEFAULT 'PENDIENTE_VERIFICACION_EMAIL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Partner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductoBase" (
    "id" UUID NOT NULL,
    "skuIndustrial" TEXT NOT NULL,
    "nombreTecnico" TEXT NOT NULL,
    "especificacionesJson" JSONB,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductoBase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RepresentacionPartner" (
    "id" UUID NOT NULL,
    "productoBaseId" UUID NOT NULL,
    "partnerId" UUID NOT NULL,
    "skuComercial" TEXT NOT NULL,
    "nombreComercial" TEXT NOT NULL,
    "imagenUrl" TEXT,
    "documentacionUrl" TEXT,
    "pvpBase" DECIMAL(12,2) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RepresentacionPartner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cart" (
    "id" UUID NOT NULL,
    "partnerId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CartItem" (
    "id" UUID NOT NULL,
    "cartId" UUID NOT NULL,
    "representacionPartnerId" UUID NOT NULL,
    "cantidad" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CartItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" UUID NOT NULL,
    "codigoPed" TEXT NOT NULL,
    "partnerId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "estado" "EstadoPedido" NOT NULL DEFAULT 'RECIBIDO',
    "direccionEnvio" TEXT NOT NULL,
    "poNumber" TEXT NOT NULL,
    "notas" TEXT,
    "totalNeto" DECIMAL(12,2) NOT NULL,
    "transportista" TEXT,
    "numeroExpedicion" TEXT,
    "trackingUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "representacionPartnerId" UUID,
    "skuComercial" TEXT NOT NULL,
    "nombreProducto" TEXT NOT NULL,
    "pvpHistorico" DECIMAL(12,2) NOT NULL,
    "descuentoAplicado" DECIMAL(5,2) NOT NULL,
    "precioNetoUnitario" DECIMAL(12,2) NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "totalLinea" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "level" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "userId" UUID,
    "partnerId" UUID,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "endpoint" TEXT,
    "method" TEXT,
    "payload" JSONB,
    "statusCode" INTEGER,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_tokenVerificacion_key" ON "User"("tokenVerificacion");

-- CreateIndex
CREATE INDEX "User_partnerId_idx" ON "User"("partnerId");

-- CreateIndex
CREATE UNIQUE INDEX "Partner_cif_key" ON "Partner"("cif");

-- CreateIndex
CREATE INDEX "Partner_estado_idx" ON "Partner"("estado");

-- CreateIndex
CREATE UNIQUE INDEX "ProductoBase_skuIndustrial_key" ON "ProductoBase"("skuIndustrial");

-- CreateIndex
CREATE INDEX "RepresentacionPartner_productoBaseId_idx" ON "RepresentacionPartner"("productoBaseId");

-- CreateIndex
CREATE INDEX "RepresentacionPartner_partnerId_activo_idx" ON "RepresentacionPartner"("partnerId", "activo");

-- CreateIndex
CREATE UNIQUE INDEX "RepresentacionPartner_partnerId_skuComercial_key" ON "RepresentacionPartner"("partnerId", "skuComercial");

-- CreateIndex
CREATE UNIQUE INDEX "Cart_partnerId_userId_key" ON "Cart"("partnerId", "userId");

-- CreateIndex
CREATE INDEX "CartItem_representacionPartnerId_idx" ON "CartItem"("representacionPartnerId");

-- CreateIndex
CREATE UNIQUE INDEX "CartItem_cartId_representacionPartnerId_key" ON "CartItem"("cartId", "representacionPartnerId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_codigoPed_key" ON "Order"("codigoPed");

-- CreateIndex
CREATE INDEX "Order_partnerId_estado_idx" ON "Order"("partnerId", "estado");

-- CreateIndex
CREATE INDEX "Order_userId_idx" ON "Order"("userId");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

-- CreateIndex
CREATE INDEX "AuditLog_eventType_idx" ON "AuditLog"("eventType");

-- CreateIndex
CREATE INDEX "AuditLog_timestamp_idx" ON "AuditLog"("timestamp");

-- CreateIndex
CREATE INDEX "AuditLog_partnerId_idx" ON "AuditLog"("partnerId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepresentacionPartner" ADD CONSTRAINT "RepresentacionPartner_productoBaseId_fkey" FOREIGN KEY ("productoBaseId") REFERENCES "ProductoBase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepresentacionPartner" ADD CONSTRAINT "RepresentacionPartner_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cart" ADD CONSTRAINT "Cart_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cart" ADD CONSTRAINT "Cart_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "Cart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_representacionPartnerId_fkey" FOREIGN KEY ("representacionPartnerId") REFERENCES "RepresentacionPartner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_representacionPartnerId_fkey" FOREIGN KEY ("representacionPartnerId") REFERENCES "RepresentacionPartner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;
