-- Secuencia atómica para generar el correlativo legible de Order.codigoPed
-- (p. ej. "PED-000123"). No se modela en schema.prisma porque Prisma no
-- soporta sequences como tipo de campo nativo; se usa SELECT nextval(...)
-- desde PedidosService dentro de la transacción de confirmación.
CREATE SEQUENCE IF NOT EXISTS pedido_codigo_seq START WITH 1 INCREMENT BY 1;
