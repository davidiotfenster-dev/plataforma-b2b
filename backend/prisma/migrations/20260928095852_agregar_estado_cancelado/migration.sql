-- AlterEnum
ALTER TYPE "EstadoPedido" ADD VALUE 'CANCELADO';

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "motivoCancelacion" TEXT;
