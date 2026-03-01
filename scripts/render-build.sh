#!/usr/bin/env sh
# Build pour Render : utilise le schéma Postgres, applique le schéma en base seulement si DATABASE_URL est défini.
set -e
cp prisma/schema.postgresql.prisma prisma/schema.prisma
npm install
npx prisma generate
if [ -n "$DATABASE_URL" ]; then
  npx prisma db push
else
  echo "DATABASE_URL non défini : prisma db push ignoré (pensez à l'ajouter dans Render pour le prochain déploiement)."
fi
npm run build
