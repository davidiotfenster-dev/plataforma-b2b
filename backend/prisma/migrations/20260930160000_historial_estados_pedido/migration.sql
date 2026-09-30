-- CreateTable
CREATE TABLE "PedidoEstadoHistorial" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "estado" "EstadoPedido" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PedidoEstadoHistorial_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PedidoEstadoHistorial_orderId_createdAt_idx" ON "PedidoEstadoHistorial"("orderId", "createdAt");

-- AddForeignKey
ALTER TABLE "PedidoEstadoHistorial" ADD CONSTRAINT "PedidoEstadoHistorial_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Relleno de los pedidos que ya existen: todos entraron en RECIBIDO al crearse...
INSERT INTO "PedidoEstadoHistorial" ("id", "orderId", "estado", "createdAt")
SELECT gen_random_uuid(), o."id", 'RECIBIDO', o."createdAt" FROM "Order" o;

-- ...y cada cambio posterior queda en el registro de auditoría.
INSERT INTO "PedidoEstadoHistorial" ("id", "orderId", "estado", "createdAt")
SELECT gen_random_uuid(), o."id", (a."payload"->>'estadoNuevo')::"EstadoPedido", a."timestamp"
FROM "AuditLog" a
JOIN "Order" o ON o."codigoPed" = a."payload"->>'codigoPed'
WHERE a."eventType" = 'PEDIDO_ESTADO_ACTUALIZADO'
  AND a."payload"->>'estadoNuevo' IN ('RECIBIDO','CONFIRMADO','EN_PREPARACION','PREPARADO','ENVIADO','CANCELADO');

-- Un pedido cuyo estado actual no aparece en su historial (cambiado sin pasar por la API) lo recibe con su última modificación.
INSERT INTO "PedidoEstadoHistorial" ("id", "orderId", "estado", "createdAt")
SELECT gen_random_uuid(), o."id", o."estado", o."updatedAt"
FROM "Order" o
WHERE NOT EXISTS (SELECT 1 FROM "PedidoEstadoHistorial" h WHERE h."orderId" = o."id" AND h."estado" = o."estado");
