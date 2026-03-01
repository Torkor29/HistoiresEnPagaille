# Déploiement sur Render

Ce guide permet d’héberger la web app **Histoires Enfant** sur [Render](https://render.com).

## Schémas Prisma : local vs prod (ne pas mélanger)

- **`prisma/schema.prisma`** = **toujours SQLite** pour le dev local. Ton `.env` doit avoir `DATABASE_URL="file:./dev.db"`. Ne pas le remplacer.
- **`prisma/schema.postgresql.prisma`** = **PostgreSQL** pour la prod (Render, Neon). Il n’est utilisé que pendant le build sur Render (`prisma generate --schema=...` et `prisma db push --schema=...`).

En local tu ne touches qu’à `schema.prisma` et à `DATABASE_URL` (fichier SQLite). Sur Render, le script de build utilise uniquement `schema.postgresql.prisma` sans modifier ton repo.

**Erreur en local « the URL must start with postgresql:// »** : le client Prisma a été généré avec le schéma Postgres (ex. après un build pour Render). En lançant `npm run dev` ou `npm run dev:all`, le script exécute maintenant `prisma generate` en premier, donc le client redevient SQLite. Vérifie que ton `.env` contient bien **`DATABASE_URL="file:./dev.db"`** (et pas une URL Postgres).

## Prérequis

- Un compte Render
- Une clé API pour les images : **GEMINI_API_KEY** (Google AI) et/ou **REPLICATE_API_TOKEN**

## Option A : Déploiement avec le Blueprint (un seul service)

1. Créez une base **PostgreSQL** où vous voulez (gratuit) :
   - [Neon](https://neon.tech), [Supabase](https://supabase.com), ou sur Render : **New** → **PostgreSQL** (sans lier au blueprint).  
   Copiez l’URL de connexion. **Avec Neon** : utilisez l’URL **pooled** (hostname avec `-pooler`, ex. `ep-xxx-pooler.region.aws.neon.tech`) pour éviter les erreurs « Connection closed » en prod.

2. Poussez le projet sur GitHub (ou GitLab).

3. Sur [Render Dashboard](https://dashboard.render.com), **New** → **Blueprint**, connectez le dépôt et sélectionnez `render.yaml`.  
   Render crée **un seul service** (Web), pas de base automatique.

4. Dans le Web Service, onglet **Environment**, ajoutez les variables **secrètes** :
   - **`DATABASE_URL`** : l’URL PostgreSQL de l’étape 1.
   - **`GEMINI_API_KEY`** (ou `REPLICATE_API_TOKEN`) pour les illustrations.

5. Déployez. Le build exécute `scripts/render-build.sh` (`prisma generate` et `db push` avec le schéma Postgres uniquement, sans modifier ton schéma local).

L’app est disponible à l’URL Render (ex. `https://histoires-enfant.onrender.com`).

## Option B : Déploiement manuel (sans Blueprint)

1. **Base PostgreSQL**  
   Créez une base (Neon, Supabase, ou Render → **New** → **PostgreSQL**). Notez **DATABASE_URL**.

2. **Nouveau Web Service**  
   Render → **New** → **Web Service**, branchez le dépôt.

3. **Configuration du service**
   - **Runtime** : Node
   - **Build Command** : `sh scripts/render-build.sh`
     (ou la commande longue équivalente si vous ne utilisez pas le script.)
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
| `GEMINI_USE_RELAXED_SAFETY` | Optionnel | `false` pour désactiver les réglages de sécurité assouplis (si blocages inattendus). |

## Après le déploiement

### Remplir les thèmes préfaits (synopsis par thème) — une seule fois

Les **noms** des thèmes (Pirates, Espace, Cirque, etc.) viennent du code et sont toujours là. En revanche, les **synopsis préfaits** (le contenu de chaque histoire type « Aventure 1 / 2 » par thème) sont en base : une Neon neuve a la table `PremadeSynopsis` vide.

Pour avoir **tous les thèmes avec leurs synopsis**, comme en local, exécute **une fois** le script de seed en pointant vers ta base Neon. **Recommandé** (sans toucher à ton Prisma local) :

```bash
NEON_DATABASE_URL="postgresql://neondb_owner:...@ep-....-pooler.region.aws.neon.tech/neondb?sslmode=require"
node scripts/seed-premade-to-neon.js
```

Utilise la même URL que sur Render (pooled). Aucun `prisma generate` ni modification de `schema.prisma`.

**Alternative** avec Prisma : `npx prisma generate --schema=prisma/schema.postgresql.prisma` puis `DATABASE_URL="postgresql://..." node scripts/seed-premade-synopses.js`. Pense à relancer ensuite `npx prisma generate` (sans --schema) pour retrouver le client SQLite en local.

- Les **formats de livre** (A4, A5, etc.) sont créés automatiquement par l’app au premier usage, pas besoin de seed (ils peuvent aussi être pré-remplis sur Neon).
- **Alternative sans Prisma** : pour remplir uniquement les synopsis préfaits sur Neon : `NEON_DATABASE_URL="postgresql://..." node scripts/seed-premade-to-neon.js` (nécessite `pg`).
- **Copier local → Neon** : avec des données modifiées en local (SQLite), définis `NEON_DATABASE_URL` et `DATABASE_URL`, puis `npm run sync-to-neon`.
- Pour **changer le schéma** de la base : adapter `prisma/schema.postgresql.prisma`, puis garder `npx prisma db push` dans le Build Command sur Render.

## Pourquoi ça marche en local mais pas en ligne ?

Ta clé API est **la même**, mais en local c’est ton fichier **`.env`** qui est lu au démarrage de l’app. En ligne (Render), **il n’y a pas de `.env`** : les variables doivent être définies dans le **Dashboard Render** et sont injectées **au moment où le service tourne**.

Donc si « la clé est bonne » en local et que ça ne marche pas en ligne, dans 99 % des cas c’est que **l’app en ligne ne reçoit pas la clé** :

1. **Variable pas définie sur Render**  
   Dashboard → ton Web Service → **Environment**. Il doit y avoir une entrée **exactement** nommée `GEMINI_API_KEY` (sensible à la casse, pas d’espace). La valeur = ta clé (en Secret si tu veux qu’elle soit masquée).

2. **Variable ajoutée après le déploiement**  
   Dès que tu modifies l’Environment, il faut faire **Save** puis **Manual Deploy** (ou déclencher un nouveau déploiement). L’instance qui tourne ne recharge pas les variables toute seule.

3. **Typo ou mauvaise variable**  
   Un espace en trop, `GEMINI_API_KEY ` au lieu de `GEMINI_API_KEY`, ou une variable préremplie vide : l’app reçoit alors une chaîne vide et Gemini n’est pas « disponible ».

**Vérification rapide** : une fois l’app déployée, ouvre dans le navigateur :  
`https://ton-app.onrender.com/api/env-check`  
Tu dois voir `"geminiConfigured": true`. Si c’est `false`, la clé n’est pas vue par le serveur → retourne sur Render, corrige l’Environment, sauvegarde, redéploie, puis revérifie `/api/env-check`.

## Dépannage

- **Build échoue sur `prisma db push`** : vérifier que `DATABASE_URL` est bien défini pour le **build** (Render propose d’injecter les variables de la DB au build).
- **Erreur "column does not exist"** : le schéma en prod n’est pas à jour. Relancer un déploiement (build refait un `prisma db push`).
- **Images / illustrations ne s’affichent pas** : vérifier que `UPLOAD_DIR` pointe vers un Disk monté si vous utilisez l’option 1 (Render Disk), et que le dossier existe.
- **« Réponse Gemini bloquée » / PROHIBITED_CONTENT** : d’abord vérifier `/api/env-check` (si `geminiConfigured: false`, voir la section « Pourquoi ça marche en local mais pas en ligne ? »). Si la clé est bien vue, le blocage vient du contenu ou des filtres Google ; essayer un autre thème, ou ajouter la variable **`GEMINI_USE_RELAXED_SAFETY`** = `false` au même endroit que `GEMINI_API_KEY` (onglet Environment sur Render, ou dans ton `.env` en local).
- **Erreur PostgreSQL "Connection closed" / "Error kind: Closed"** : avec Neon, il faut (1) utiliser l’**URL en mode pooler** (hostname avec **`-pooler`**, ex. `ep-xxx-pooler.eu-west-2.aws.neon.tech`) — Dashboard Neon → Connect → activer **Connection pooling** et copier cette URL ; (2) ajouter **`&connect_timeout=15`** à la fin de `DATABASE_URL` sur Render (ex. `...?sslmode=require&connect_timeout=15`) pour limiter les timeouts au réveil du compute. Si l’erreur continue, vérifier que tu n’utilises pas l’URL « direct » (sans `-pooler`).
