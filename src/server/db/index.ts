import { PrismaClient } from '@prisma/client';
import { logger } from '@/lib/logger';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export async function getBookFormats() {
  const count = await prisma.bookFormat.count();
  if (count === 0) {
    logger.info('Seeding book formats');
    await prisma.bookFormat.createMany({
      data: [
        {
          name: 'A4',
          widthMm: 210,
          heightMm: 297,
          usageHint: 'Album illustré, grand format',
          pagesShort: 12,
          pagesMedium: 20,
          pagesLong: 32,
          imageRatio: '4:3',
          fontSizeMin: 12,
          fontSizeMax: 16,
        },
        {
          name: 'A5',
          widthMm: 148,
          heightMm: 210,
          usageHint: 'Roman jeunesse, petit album',
          pagesShort: 16,
          pagesMedium: 28,
          pagesLong: 44,
          imageRatio: '3:4',
          fontSizeMin: 11,
          fontSizeMax: 14,
        },
        {
          name: 'US Letter',
          widthMm: 215.9,
          heightMm: 279.4,
          usageHint: 'États-Unis, rapport',
          pagesShort: 12,
          pagesMedium: 20,
          pagesLong: 32,
          imageRatio: '4:3',
          fontSizeMin: 12,
          fontSizeMax: 16,
        },
        {
          name: '8×8"',
          widthMm: 203.2,
          heightMm: 203.2,
          usageHint: 'Album carré jeunesse',
          pagesShort: 12,
          pagesMedium: 24,
          pagesLong: 36,
          imageRatio: '1:1',
          fontSizeMin: 12,
          fontSizeMax: 16,
        },
        {
          name: '6×9"',
          widthMm: 152.4,
          heightMm: 228.6,
          usageHint: 'Roman illustré',
          pagesShort: 20,
          pagesMedium: 36,
          pagesLong: 56,
          imageRatio: '2:3',
          fontSizeMin: 10,
          fontSizeMax: 13,
        },
        {
          name: '8.5×8.5"',
          widthMm: 215.9,
          heightMm: 215.9,
          usageHint: 'Grand carré album',
          pagesShort: 12,
          pagesMedium: 24,
          pagesLong: 36,
          imageRatio: '1:1',
          fontSizeMin: 12,
          fontSizeMax: 16,
        },
      ],
    });
  }
  return prisma.bookFormat.findMany({ orderBy: { name: 'asc' } });
}
