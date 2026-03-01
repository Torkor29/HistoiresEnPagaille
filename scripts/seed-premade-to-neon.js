/**
 * Remplit la table PremadeSynopsis sur Neon (PostgreSQL) avec les mêmes données
 * que le seed local. N'utilise que pg, pas Prisma.
 *
 * Usage : NEON_DATABASE_URL="postgresql://..." node scripts/seed-premade-to-neon.js
 */

const { Client } = require('pg');
const crypto = require('crypto');

const NEON_URL = process.env.NEON_DATABASE_URL;
if (!NEON_URL) {
  console.error('Définis NEON_DATABASE_URL puis relance : node scripts/seed-premade-to-neon.js');
  process.exit(1);
}

const THEMES = [
  { id: 'pirates', label: 'Pirates', icon: '🏴‍☠️' },
  { id: 'espace', label: 'Espace', icon: '🚀' },
  { id: 'licornes', label: 'Licornes', icon: '🦄' },
  { id: 'animaux', label: 'Animaux', icon: '🐾' },
  { id: 'foret', label: 'Forêt enchantée', icon: '🌲' },
  { id: 'magie', label: 'Magie', icon: '✨' },
  { id: 'dinosaures', label: 'Dinosaures', icon: '🦕' },
  { id: 'enquete', label: 'Enquête', icon: '🔍' },
  { id: 'football', label: 'Football', icon: '⚽' },
  { id: 'mer', label: 'Mer & océan', icon: '🐠' },
  { id: 'chateau', label: 'Château & chevaliers', icon: '🏰' },
  { id: 'cirque', label: 'Cirque', icon: '🎪' },
  { id: 'savane', label: 'Savane', icon: '🦁' },
  { id: 'robot', label: 'Robots', icon: '🤖' },
  { id: 'cuisine', label: 'Cuisine & gourmandise', icon: '🧁' },
  { id: 'sport', label: 'Sport & olympiades', icon: '🏅' },
  { id: 'musique', label: 'Musique', icon: '🎵' },
  { id: 'jardin', label: 'Jardin & nature', icon: '🌻' },
  { id: 'nuit', label: 'Nuit & étoiles', icon: '🌙' },
  { id: 'avion', label: 'Voyage & avion', icon: '✈️' },
  { id: 'sorciere', label: 'Sorcière bienveillante', icon: '🧙‍♀️' },
  { id: 'dragons', label: 'Dragons', icon: '🐉' },
  { id: 'princesse', label: 'Princesse & royaume', icon: '👑' },
  { id: 'superheros', label: 'Super-héros', icon: '🦸' },
  { id: 'noel', label: 'Noël', icon: '🎄' },
  { id: 'halloween', label: 'Halloween (gentil)', icon: '🎃' },
  { id: 'ecole', label: 'École & amis', icon: '📚' },
  { id: 'campagne', label: 'Campagne & ferme', icon: '🚜' },
  { id: 'montagne', label: 'Montagne & neige', icon: '⛷️' },
  { id: 'plage', label: 'Plage & vacances', icon: '🏖️' },
];

function makeSynopsis(themeLabel, variante) {
  const baseTitle = `${themeLabel} - Aventure ${variante}`;
  const lieuIntro = `Dans l'univers de ${themeLabel.toLowerCase()}`;
  const moral =
    variante === 1
      ? "Apprendre que l'on est plus fort à plusieurs qu'en restant seul."
      : "Découvrir qu'il faut persévérer et croire en soi même quand tout semble compliqué.";

  return {
    title: baseTitle,
    childCharacterName: 'Léo',
    moral,
    chapters: [
      {
        title: 'Chapitre 1 - Le grand départ',
        scenes: [
          { title: 'Une idée qui brille', summary: `${lieuIntro}, Léo imagine une aventure extraordinaire et décide de se lancer, malgré les petits doutes qu'il ressent.` },
          { title: 'Préparatifs et promesses', summary: "Avec l'aide de ses proches, Léo prépare tout ce dont il a besoin et promet de faire preuve de courage et de gentillesse." },
        ],
      },
      {
        title: 'Chapitre 2 - Les surprises du voyage',
        scenes: [
          { title: 'Un obstacle inattendu', summary: "Un obstacle apparaît sur la route (un danger léger mais impressionnant) et Léo doit réfléchir plutôt que foncer tête baissée." },
          { title: 'De nouveaux alliés', summary: "Léo rencontre un ou plusieurs nouveaux amis liés au thème qui l'aident avec leurs idées et leurs talents." },
        ],
      },
      {
        title: 'Chapitre 3 - La grande résolution',
        scenes: [
          { title: 'Un plan malin', summary: "En combinant le courage de Léo et les idées de ses amis, ils trouvent une solution astucieuse pour atteindre leur objectif." },
          { title: 'Retour à la maison', summary: "Léo rentre chez lui fier de lui, plus confiant et heureux d'avoir partagé cette aventure avec ses nouveaux amis." },
        ],
      },
    ],
  };
}

function cuidLike() {
  const hex = crypto.randomBytes(12).toString('hex');
  return 'c' + hex.slice(0, 24);
}

async function main() {
  const client = new Client({ connectionString: NEON_URL });
  await client.connect();

  try {
    await client.query('DELETE FROM "PremadeSynopsis"');
    let created = 0;

    for (const theme of THEMES) {
      const list = [makeSynopsis(theme.label, 1), makeSynopsis(theme.label, 2)];
      for (let i = 0; i < list.length; i++) {
        const id = cuidLike();
        const synopsis = JSON.stringify(list[i]);
        await client.query(
          `INSERT INTO "PremadeSynopsis" (id, "themeId", "themeLabel", icon, synopsis, "sortOrder", "createdAt")
           VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
          [id, theme.id, theme.label, theme.icon, synopsis, i]
        );
        created++;
      }
    }

    console.log(`Neon : ${created} synopsis préfaits insérés (2 par thème).`);
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
