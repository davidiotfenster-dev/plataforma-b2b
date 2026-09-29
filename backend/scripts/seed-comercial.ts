/// Crea un usuario COMERCIAL. Uso:
///   COMERCIAL_EMAIL=comercial@fenster.internal COMERCIAL_PASSWORD=... COMERCIAL_NOMBRE="Nombre" npm run seed:comercial
import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { RolUsuario } from '../src/generated/prisma/enums.js';

const SALT_ROUNDS = 12;

async function main() {
  const email = process.env.COMERCIAL_EMAIL;
  const password = process.env.COMERCIAL_PASSWORD;
  const nombre = process.env.COMERCIAL_NOMBRE ?? 'Comercial IoT FENSTER';

  if (!email || !password) {
    console.error('Uso: COMERCIAL_EMAIL=... COMERCIAL_PASSWORD=... [COMERCIAL_NOMBRE=...] npm run seed:comercial');
    process.exit(1);
  }
  if (password.length < 8) {
    console.error('COMERCIAL_PASSWORD debe tener al menos 8 caracteres.');
    process.exit(1);
  }

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

  try {
    const existente = await prisma.user.findUnique({ where: { email } });
    if (existente) {
      console.error(`Ya existe un usuario con email ${email}.`);
      process.exit(1);
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const comercial = await prisma.user.create({
      data: { email, passwordHash, nombre, rol: RolUsuario.COMERCIAL, activo: true, emailVerificadoEn: new Date() },
    });

    console.log(`COMERCIAL creado: ${comercial.id} <${comercial.email}>`);
  } finally {
    await prisma.$disconnect();
  }
}

main();
