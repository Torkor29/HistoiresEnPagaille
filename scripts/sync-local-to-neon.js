/**
 * Copie les données "inspirations" (PremadeSynopsis) et formats livre (BookFormat)
 * de la base locale (SQLite) vers Neon (PostgreSQL).
 *
 * Usage :
 *   1. .env local : DATABASE_URL pointe vers ta SQLite (file:./prisma/dev.db ou autre)
 *   2. Définis NEON_DATABASE_URL avec ton URL Neon (celle utilisée sur Render)
 *   3. npm run sync-to-neon
 *
 * Prérequis : npm install (pg est utilisé pour écrire dans Neon).
 */

const { PrismaClient } = require('@prisma/client');
const { Client } = require('pg');

const NEON_URL = process.env.NEON_DATABASE_URL;
if (!NEON_URL) {
  console.error('Définis NEON_DATABASE_URL (URL PostgreSQL Neon) puis relance : npm run sync-to-neon');
  process.exit(1);
}

const prisma = new PrismaClient();

function toPgDate(jsDate) {
  if (!jsDate) return null;
  const d = new Date(jsDate);
  return d.toISOString();
}

async function main() {
  console.log('Lecture des données locales (SQLite)...');
  const [premade, bookFormats] = await Promise.all([
    prisma.premadeSynopsis.findMany({ orderBy: [{ themeId: 'asc' }, { sortOrder: 'asc' }] }),
    prisma.bookFormat.findMany({ orderBy: { name: 'asc' } }),
  ]);
  console.log(`  → ${premade.length} synopsis préfaits, ${bookFormats.length} formats livre.`);

  const client = new Client({ connectionString: NEON_URL });
  await client.connect();

  try {
    // BookFormat
    await client.query('DELETE FROM "BookFormat"');
    if (bookFormats.length) {
      for (const row of bookFormats) {
        await client.query(
          `INSERT INTO "BookFormat" (id, name, "widthMm", "heightMm", "usageHint", "pagesShort", "pagesMedium", "pagesLong", "imageRatio", "fontSizeMin", "fontSizeMax", "createdAt")
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [
            row.id,
            row.name,
            row.widthMm,
            row.heightMm,
            row.usageHint,
            row.pagesShort,
            row.pagesMedium,
            row.pagesLong,
            row.imageRatio,
            row.fontSizeMin,
            row.fontSizeMax,
            toPgDate(row.createdAt),
          ]
        );
      }
      console.log(`  → ${bookFormats.length} formats livre copiés vers Neon.`);
    }

    // PremadeSynopsis
    await client.query('DELETE FROM "PremadeSynopsis"');
    if (premade.length) {
      for (const row of premade) {
        await client.query(
          `INSERT INTO "PremadeSynopsis" (id, "themeId", "themeLabel", icon, synopsis, "sortOrder", "createdAt")
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            row.id,
            row.themeId,
            row.themeLabel,
            row.icon,
            row.synopsis,
            row.sortOrder,
            toPgDate(row.createdAt),
          ]
        );
      }
      console.log(`  → ${premade.length} synopsis préfaits copiés vers Neon.`);
    }

    console.log('Neon est à jour.');
  } finally {
    await client.end();
  }
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
