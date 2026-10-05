-- Renombra el valor CLIENTE del tipo de empresa a DISTRIBUIDOR.
-- Escrita a mano: si Prisma la generara sola, borraría y recrearía el tipo.
-- RENAME VALUE conserva los datos, el índice Partner_tipo_idx y el valor por
-- defecto de la columna (que sigue apuntando al mismo valor, ya renombrado).
-- Para deshacerla: ALTER TYPE "TipoEmpresa" RENAME VALUE 'DISTRIBUIDOR' TO 'CLIENTE';

-- AlterEnum
ALTER TYPE "TipoEmpresa" RENAME VALUE 'CLIENTE' TO 'DISTRIBUIDOR';
