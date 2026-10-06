-- Índices para las claves foráneas que no tenían: sobre todo OrderItem.representacionPartnerId,
-- que la base recorre entera al quitar un producto de un catálogo. AuditLog(userId) pasa a
-- (userId, timestamp) para la pantalla de actividad de un usuario (sirve igual para lo anterior).

-- DropIndex
DROP INDEX "AuditLog_userId_idx";

-- CreateIndex
CREATE INDEX "AuditLog_userId_timestamp_idx" ON "AuditLog"("userId", "timestamp");

-- CreateIndex
CREATE INDEX "Cart_userId_idx" ON "Cart"("userId");

-- CreateIndex
CREATE INDEX "OrderItem_representacionPartnerId_idx" ON "OrderItem"("representacionPartnerId");

-- CreateIndex
CREATE INDEX "ProductoMarca_productoBaseId_idx" ON "ProductoMarca"("productoBaseId");

-- CreateIndex
CREATE INDEX "RepresentacionPartner_productoMarcaId_idx" ON "RepresentacionPartner"("productoMarcaId");

