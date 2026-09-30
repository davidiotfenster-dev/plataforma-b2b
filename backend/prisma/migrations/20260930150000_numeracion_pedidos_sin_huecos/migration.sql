-- La numeración de pedidos (Order.codigoPed) deja de usar una secuencia de
-- PostgreSQL: ahora es el último número existente + 1, calculado dentro de la
-- transacción de confirmación con un bloqueo (ver src/pedidos/codigo-pedido.ts),
-- así no quedan huecos cuando una confirmación falla.
DROP SEQUENCE IF EXISTS pedido_codigo_seq;
