# Histoires Enfant

Application web de création d’histoires pour enfants personnalisées, avec génération de texte et d’illustrations via l’API Google Gemini.

## Fonctionnalités

- **Wizard** : profil enfant (prénom, âge, pronoms, centres d’intérêt, niveau de lecture, à éviter, valeurs), thème, format livre, idées optionnelles, photos de référence, style visuel.
- **Génération** : synopsis structuré (JSON), histoire finale avec scènes, illustrations par scène (cohérence personnage si photos fournies).
- **Livre imprimable** : format (A4, A5, 8×8", etc.), couverture, 4e de couverture, mise en page, export PDF intérieur, PDF couverture wrap, pack ZIP pour impression.
- **Sécurité** : clé API Gemini uniquement côté serveur, prompts adaptés jeunesse, pas d’incitation aux données personnelles.

## Stack

- **Frontend** : Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend** : API Routes Next.js, Prisma
- **Base de données** : SQLite (dev), Postgres (prod)
- **IA** : SDK `@google/genai`. Pour un même livre : **un modèle texte** (synopsis, histoire, 4e de couv., plan de pages, description personnage) et **un ou deux modèles image** (illustrations). Les illustrations reçoivent le contexte du livre (titre, ambiance) pour rester cohérentes. Génération d’images : **Gemini**, **Replicate** (consistent-character) ou **Local** (SD / ComfyUI).
- **PDF** : pdf-lib
- **Validation** : zod
- **Tests** : vitest

## Prérequis

- Node.js 18+
- Clé API Google Gemini ([Google AI Studio](https://aistudio.google.com/apikey))

## Installation

```bash
npm install
cp .env.example .env
# Éditer .env : au minimum DATABASE_URL (déjà présent pour SQLite), et GEMINI_API_KEY pour la génération.
```

## Base de données

```bash
# SQLite (dev) : .env contient DATABASE_URL="file:./dev.db"
npx prisma generate
npx prisma migrate dev
# Optionnel : seed des formats livre au premier lancement (automatique via getBookFormats)
```

Pour la production (Postgres), définir `DATABASE_URL` et exécuter les migrations sur la base cible.

## Démarrage

```bash
npm run dev
```

Cela lance en une seule commande :
- **App Next.js** sur [http://localhost:3000](http://localhost:3000)
- **Serveur local d’images** sur http://localhost:8188 (pour l’option « Local » à l’étape Génération ; illustrations en placeholder tant que vous n’avez pas branché ComfyUI/SD)

Ouvrir [http://localhost:3000](http://localhost:3000), créer un projet, et à l’étape Génération vous pouvez choisir **Local** sans rien lancer à part.

## Variables d’environnement (.env)

| Variable | Description |
|----------|-------------|
| `GEMINI_API_KEY` | Clé API Google Gemini (obligatoire pour génération) |
| `GEMINI_MODEL_TEXT` | (Optionnel) Modèle pour le texte (défaut : gemini-2.0-flash) |
| `GEMINI_MODEL_IMAGE_CONSISTENCY` / `GEMINI_MODEL_IMAGE_FAST` | (Optionnel) Modèles pour les illustrations (défaut : gemini-2.5-flash-image) |
| `DATABASE_URL` | SQLite : `file:./dev.db` / Postgres en prod |
| `STORAGE_PROVIDER` | `local` (dev) ou `s3` (prod) |
| `UPLOAD_DIR` | Dossier des uploads en local (ex. `./uploads`) |
| `LOG_LEVEL` | `info`, `debug`, etc. |
| `NEXT_PUBLIC_APP_URL` | URL de l’app (optionnel) |
| **Images (au choix à la génération)** | |
| `GEMINI_API_KEY` | Google : texte + images (si disponible) |
| `REPLICATE_API_TOKEN` | Replicate : cohérence de personnage. **Gratuit** : crédits offerts à l’inscription ; ensuite ~0,04 €/image ([replicate.com](https://replicate.com)) |
| `LOCAL_IMAGE_API_URL` | URL du serveur local inclus (défaut `http://localhost:8188/generate`) |
| `STABLE_DIFFUSION_URL` | Pour l’option Local : URL de votre SD WebUI (ex. `http://127.0.0.1:7860`). Voir [docs/OPTION3-INSTALLATION.md](docs/OPTION3-INSTALLATION.md) |
| `FORGE_PATH` | (Optionnel) Dossier Forge contenant `run.bat`. Si défini, `npm run dev:all` lance Forge puis l’app. |

## Scripts

- `npm run dev` — serveur de développement (Next.js + serveur images)
- `npm run dev:all` — lance Forge puis l’app (si `FORGE_PATH` défini dans `.env`)
- `npm run build` — build production
- `npm run start` — démarrage production
- `npm run test` — tests (vitest)
- `npm run db:migrate` — migrations Prisma
- `npm run db:studio` — Prisma Studio

## Structure du projet

```
src/
  app/          # App Router (pages, layout, API routes)
  components/   # Composants React (Wizard, etc.)
  lib/          # Schémas zod, prompts, logger
  server/       # DB, storage, services Gemini, PDF
```

## Impression (résumé)

- **Fond perdu (bleed)** : configurable par format (défaut 3 mm). Pris en compte dans les exports PDF.
- **Couverture wrap** : 1re + dos + 4e en une planche ; dimensions calculées selon nombre de pages et épaisseur dos (approximation MVP).
- **Zone de sécurité** : marge de sécurité (safe margin) configurable.
- **Export** : PDF intérieur, PDF couverture wrap, ZIP (intérieur + assets + metadata). Guide “Impression” sur la page Export.

## Replicate — ce que vous pouvez utiliser en gratuit

Avec votre token Replicate (`REPLICATE_API_TOKEN` dans `.env`) :

- **Au début** : Replicate offre des **crédits gratuits** à l’inscription. Vous pouvez générer des illustrations sans payer tant que ces crédits suffisent.
- **Modèle utilisé par l’app** : `sdxl-based/consistent-character` (cohérence de personnage à partir d’une photo de référence). Coût après épuisement des crédits : ~0,04 € par image.
- **Dans l’app** : à l’étape **Génération**, choisir « Replicate (gratuit / peu coûteux, cohérent) ».

Vérifiez votre solde et l’historique des runs sur [replicate.com/account](https://replicate.com/account).

---

## Option 3 — Serveur local (Stable Diffusion sur votre PC)

Pour générer les illustrations **chez vous** avec **Stable Diffusion** (sans Replicate) :

1. **Installez Stable Diffusion** en suivant le guide : **[docs/OPTION3-INSTALLATION.md](docs/OPTION3-INSTALLATION.md)** (Forge tout-en-un recommandé).
2. Activez l'API (`--api` dans `webui-user.bat`) et dans `.env` : `STABLE_DIFFUSION_URL=http://127.0.0.1:7860`.
3. Lancez d'abord Forge, puis `npm run dev` ; à l'étape Génération choisissez **Local**.

Détails : contrat API (prompt + ref image → PNG), `npm run local-image-server`, `LOCAL_IMAGE_PORT` / `LOCAL_IMAGE_API_URL` dans le guide.


## Licence

Privé / usage personnel. Utilisation de l’API Gemini soumise aux conditions Google.
