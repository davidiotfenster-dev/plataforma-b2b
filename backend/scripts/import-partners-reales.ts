/// Alta manual de partners reales a partir de un listado (nombre + código de
/// cliente del ERP interno) pasado por David, sin pasar por el registro
/// público. CIF, dirección, país y dominio son PLACEHOLDERS deliberadamente
/// no confundibles con datos reales (formato "PENDIENTE-...") — hay que
/// editarlos desde `admin/partners` en cuanto se tengan los datos de verdad.
/// Idempotente: si el código de cliente ya existe, se omite esa fila.
///
/// Uso:
///   npm run import:partners-reales
import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { EstadoPartner, RolUsuario } from '../src/generated/prisma/enums.js';

const SALT_ROUNDS = 12;
const PASSWORD_PROVISIONAL = 'Fenster2026!';

/// (razón social, código de cliente) tal como aparecen en el listado.
const PARTNERS: [string, string][] = [
  ['SISTEPLAST', '2802'],
  ['VBH', '2537'],
  ['Accesorios Alu Y PVC', '3539'],
  ['HAUSEN', '3218'],
  ['COMALFER', '3644'],
  ['Suministros Mayor', '3537'],
  ['PERSAX', '3283'],
  ['PROCOMSA', '3579'],
  ['Suministros Alcantarilla', '3518'],
  ['BIEMME FINESTRE', '3858'],
  ['Armando Carracedo', '3923'],
  ['AEDOS', '3920'],
  ['PTA', '3949'],
];

function slug(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // quita acentos
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function main() {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  const passwordHash = await bcrypt.hash(PASSWORD_PROVISIONAL, SALT_ROUNDS);
  const creados: { razonSocial: string; email: string }[] = [];

  try {
    for (const [razonSocial, codigoCliente] of PARTNERS) {
      const existente = await prisma.partner.findUnique({ where: { codigoCliente } });
      if (existente) {
        console.log(`  ${razonSocial} (código ${codigoCliente}) ya existe, se omite.`);
        continue;
      }

      const dominioWeb = `${slug(razonSocial)}.pendiente.test`;
      const email = `contacto@${dominioWeb}`;

      const partner = await prisma.partner.create({
        data: {
          razonSocial,
          codigoCliente,
          cif: `PENDIENTE-${codigoCliente}`,
          direccionFiscal: 'Pendiente de completar',
          pais: 'España',
          dominioWeb,
          tarifa: 'Estandar',
          descuentoPorcentaje: 0,
          estado: EstadoPartner.ACTIVO,
        },
      });

      await prisma.user.create({
        data: {
          email,
          passwordHash,
          nombre: razonSocial,
          rol: RolUsuario.PARTNER_ADMIN,
          partnerId: partner.id,
          activo: true,
          emailVerificadoEn: new Date(),
        },
      });

      creados.push({ razonSocial, email });
      console.log(`  ${razonSocial} creado (código ${codigoCliente}, CIF provisional ${partner.cif}).`);
    }

    if (creados.length > 0) {
      console.log(`\n${creados.length} partner(s) creados, todos con la contraseña provisional: ${PASSWORD_PROVISIONAL}`);
      console.log('IMPORTANTE: CIF, dirección, país, dominio y email son PLACEHOLDERS — editar desde admin/partners en cuanto se tengan los datos reales.');
      for (const c of creados) console.log(`  - ${c.razonSocial}: ${c.email}`);
    } else {
      console.log('\nNo se creó ningún partner nuevo (todos los códigos de cliente ya existían).');
    }
  } finally {
    await prisma.$disconnect();
  }
}

main();
