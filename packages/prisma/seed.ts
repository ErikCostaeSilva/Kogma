/**
 * packages/prisma/seed.ts
 * Rodar com: npm run db:seed
 */
import { PrismaClient, Role, Status, Unit } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('➡️  Iniciando seed...');

  // Admin
  const adminEmail = 'erikcostaesilva0@gmail.com';
  const adminPassword = 'admin123';
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      name: 'Administrador',
      email: adminEmail,
      passwordHash,         // <- camelCase
      role: Role.ADMIN,     // <- enum Prisma
    },
  });

  // Empresa
  const company = await prisma.company.upsert({
    where: { cnpj: '12.345.678/0001-90' },
    update: {},
    create: {
      name: 'Kogma Indústria Ltda',
      cnpj: '12.345.678/0001-90',
    },
  });

  // Pedido + Material + Processo (com enums do Prisma)
  const order = await prisma.order.create({
    data: {
      companyId: company.id,        // <- camelCase
      title: 'Ordem de Produção Inicial',
      qty: 100,
      unit: Unit.PECAS,             // <- enum Prisma
      clientDeadline: new Date('2025-09-30'),
      finalDeadline: new Date('2025-10-15'),
      status: Status.OPEN,          // <- enum Prisma
      materials: {
        create: [{
          description: 'Chapas de Aço',
          qty: 50,
          unit: Unit.KG,
          inStock: false,
        }],
      },
      processes: {
        create: [{
          name: 'Corte de chapas',
          plannedDate: new Date('2025-09-20'),
          done: false,
        }],
      },
    },
  });

  console.log('✅ Seed concluída.');
  console.log({
    admin: admin.email,
    company: company.name,
    order: order.title,
  });
}

main()
  .catch((e) => {
    console.error('❌ Erro na seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
