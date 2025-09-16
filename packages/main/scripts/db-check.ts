import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../../prisma/.env') });
// Se você optou por packages/main/.env, troque o path acima para ../../main/.env

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

(async () => {
  try {
    const [row]: any = await prisma.$queryRawUnsafe('SELECT DATABASE() as db, @@hostname as host, @@port as port');
    console.log('DATABASE_URL:', String(process.env.DATABASE_URL || '').replace(/(mysql:\/\/)(.*?)(@)/, '$1***$3'));
    console.log('DB:', row?.db, 'Host:', row?.host, 'Port:', row?.port);
    const users = await prisma.user.count();
    console.log('users count:', users);
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
})();
