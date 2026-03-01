#!/usr/bin/env sh
# Build pour Render : utilise le schéma Postgres sans toucher à schema.prisma (reste SQLite pour le dev local).
set -e
npm install
npx prisma generate --schema=prisma/schema.postgresql.prisma
if [ -n "$DATABASE_URL" ]; then
  npx prisma db push --schema=prisma/schema.postgresql.prisma
else
  echo "DATABASE_URL non défini : prisma db push ignoré (pensez à l'ajouter dans Render pour le prochain déploiement)."
fi
npm run build
