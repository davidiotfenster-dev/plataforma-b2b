/// Crea el primer usuario ADMIN_FENSTER. Uso:
///   ADMIN_EMAIL=admin@fenster.internal ADMIN_PASSWORD=... ADMIN_NOMBRE="Admin FENSTER" npm run seed:admin
import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { RolUsuario } from '../src/generated/prisma/enums.js';

const SALT_ROUNDS = 12;

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const nombre = process.env.ADMIN_NOMBRE ?? 'Administrador IoT FENSTER';

  if (!email || !password) {
    console.error('Uso: ADMIN_EMAIL=... ADMIN_PASSWORD=... [ADMIN_NOMBRE=...] npm run seed:admin');
    process.exit(1);
  }
  if (password.length < 10) {
    console.error('ADMIN_PASSWORD debe tener al menos 10 caracteres.');
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
    const admin = await prisma.user.create({
      data: { email, passwordHash, nombre, rol: RolUsuario.ADMIN_FENSTER, activo: true },
    });

    console.log(`ADMIN_FENSTER creado: ${admin.id} <${admin.email}>`);
  } finally {
    await prisma.$disconnect();
  }
}

main();
