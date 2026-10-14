import { PrismaClient } from '@prisma/client';
import { PrismaD1 } from '@prisma/adapter-d1';
import dotenv from 'dotenv';

dotenv.config();

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || '';
const databaseId = process.env.CLOUDFLARE_D1_DATABASE_ID || process.env.CLOUDFLARE_DATABASE_ID || '';
const token = process.env.CLOUDFLARE_D1_TOKEN || process.env.CLOUDFLARE_API_TOKEN || '';

const adapter = new PrismaD1({
  CLOUDFLARE_ACCOUNT_ID: accountId,
  CLOUDFLARE_DATABASE_ID: databaseId,
  CLOUDFLARE_D1_TOKEN: token,
});

export const prisma = new PrismaClient({ adapter });
export default prisma;
