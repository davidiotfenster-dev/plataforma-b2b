-- CreateTable
CREATE TABLE "AjustesLegales" (
    "id" UUID NOT NULL,
    "unica" BOOLEAN NOT NULL DEFAULT true,
    "razonSocial" TEXT,
    "cif" TEXT,
    "domicilio" TEXT,
    "emailContacto" TEXT,
    "emailPrivacidad" TEXT,
    "telefono" TEXT,
    "registroMercantil" TEXT,
    "alojamiento" TEXT,
    "ciudadTribunales" TEXT,
    "portes" TEXT,
    "formaPago" TEXT,
    "devoluciones" TEXT,
    "plazoRegistros" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AjustesLegales_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AjustesLegales_unica_key" ON "AjustesLegales"("unica");

-- Datos iniciales: los de los textos legales de www.iotfenster.com (6/10/2026).
-- Registro Mercantil, portes, forma de pago y devoluciones quedan pendientes
-- hasta que se rellenen desde el panel de administración.
INSERT INTO "AjustesLegales" (
    "id", "razonSocial", "cif", "domicilio", "emailContacto", "emailPrivacidad", "telefono",
    "alojamiento", "ciudadTribunales", "plazoRegistros", "updatedAt"
) VALUES (
    gen_random_uuid(),
    'IoT Fenster, S.L.',
    'B30780191',
    'Avda. Isaac Peral s/n, Parque Tecnológico Fuente Álamo, Ctra. del Estrecho-Lobosillo, 30320 Fuente Álamo de Murcia (Murcia), España',
    'info@iotfenster.com',
    'info@iotfenster.com',
    '+34 968 124 979',
    'Amazon Web Services, servidores en la Unión Europea',
    'Murcia (España)',
    '12 meses',
    CURRENT_TIMESTAMP
);
