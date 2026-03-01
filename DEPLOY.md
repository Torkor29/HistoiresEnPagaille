# Déploiement sur Render

Ce guide permet d’héberger la web app **Histoires Enfant** sur [Render](https://render.com).

## Prérequis

- Un compte Render
- Une clé API pour les images : **GEMINI_API_KEY** (Google AI) et/ou **REPLICATE_API_TOKEN**

## Option A : Déploiement avec le Blueprint (un seul service)

1. Créez une base **PostgreSQL** où vous voulez (gratuit) :
   - [Neon](https://neon.tech), [Supabase](https://supabase.com), ou sur Render : **New** → **PostgreSQL** (sans lier au blueprint).  
   Copiez l’URL de connexion (ex. `postgresql://user:pass@host/db?sslmode=require`).

2. Poussez le projet sur GitHub (ou GitLab).

3. Sur [Render Dashboard](https://dashboard.render.com), **New** → **Blueprint**, connectez le dépôt et sélectionnez `render.yaml`.  
   Render crée **un seul service** (Web), pas de base automatique.

4. Dans le Web Service, onglet **Environment**, ajoutez les variables **secrètes** :
   - **`DATABASE_URL`** : l’URL PostgreSQL de l’étape 1.
   - **`GEMINI_API_KEY`** (ou `REPLICATE_API_TOKEN`) pour les illustrations.

5. Déployez. Le build exécute : copie du schéma Postgres → `npm install` → `prisma generate` → `prisma db push` → `npm run build`.

L’app est disponible à l’URL Render (ex. `https://histoires-enfant.onrender.com`).

## Option B : Déploiement manuel (sans Blueprint)

1. **Base PostgreSQL**  
   Créez une base (Neon, Supabase, ou Render → **New** → **PostgreSQL**). Notez **DATABASE_URL**.

2. **Nouveau Web Service**  
   Render → **New** → **Web Service**, branchez le dépôt.

3. **Configuration du service**
   - **Runtime** : Node
   - **Build Command** :
     ```bash
     cp prisma/schema.postgresql.prisma prisma/schema.prisma && npm install && npx prisma generate && npx prisma db push && npm run build
     ```
   - **Start Command** : `npm start`
   - **Variables d’environnement** :
     - `DATABASE_URL` : URL de la base PostgreSQL (collée depuis la DB créée à l’étape 1)
     - `GEMINI_API_KEY` ou `REPLICATE_API_TOKEN` (Secret)

4. **Fichiers uploadés (photos, illustrations)**  
   Par défaut, les fichiers sont écrits sur le disque du conteneur, qui est **éphémère** : ils sont perdus à chaque redéploiement.

   Pour les conserver :
   - **Option 1 – Render Disk**  
     Dans le Web Service : **Disks** → **Add Disk** (ex. 1 GB), chemin de montage : `/data`.  
     Puis ajoutez la variable d’environnement :
     - `UPLOAD_DIR` = `/data/uploads`
     - Au premier démarrage, le dossier sera créé automatiquement si le code fait un `mkdir` récursif (déjà le cas dans `createLocalStorage()`).
   - **Option 2 – S3 (avancé)**  
     Configurer `STORAGE_PROVIDER=s3` et les variables AWS/S3 (à implémenter côté code si besoin).

5. Déployez.

## Variables d’environnement utiles

| Variable | Obligatoire | Description |
|----------|-------------|-------------|
| `DATABASE_URL` | Oui (prod) | URL PostgreSQL (fournie par Render si vous utilisez leur Postgres). |
| `GEMINI_API_KEY` | Recommandé | Clé API Google AI Studio pour synopsis, texte et images (Gemini). |
| `REPLICATE_API_TOKEN` | Optionnel | Alternative pour la génération d’images (Replicate). |
| `UPLOAD_DIR` | Optionnel | Dossier des uploads (défaut : `./uploads`). Sur Render avec Disk : `/data/uploads`. |
| `NODE_VERSION` | Optionnel | Ex. `20` (Render utilise souvent 20 par défaut). |

## Après le déploiement

- Les **synopsis préfaits** (thèmes) sont chargés depuis la base. Si la table `PremadeSynopsis` est vide, exécutez une fois le seed en local puis exportez les données, ou exécutez le script de seed sur une base de prod (avec précaution).
- Pour **changer le schéma** de la base (nouveaux champs, etc.) : adapter `prisma/schema.postgresql.prisma` (ou `schema.prisma` après le `cp`), puis dans le **Build Command** garder `npx prisma db push` pour appliquer les changements sans gérer des migrations Postgres.

## Dépannage

- **Build échoue sur `prisma db push`** : vérifier que `DATABASE_URL` est bien défini pour le **build** (Render propose d’injecter les variables de la DB au build).
- **Erreur "column does not exist"** : le schéma en prod n’est pas à jour. Relancer un déploiement (build refait un `prisma db push`).
- **Images / illustrations ne s’affichent pas** : vérifier que `UPLOAD_DIR` pointe vers un Disk monté si vous utilisez l’option 1 (Render Disk), et que le dossier existe.
