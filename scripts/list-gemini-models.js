/**
 * Liste les modèles Gemini disponibles avec votre clé API (Google AI Studio).
 * Usage: node scripts/list-gemini-models.js
 * Nécessite GEMINI_API_KEY dans .env ou dans l'environnement.
 */

const path = require('path');
const fs = require('fs');

function loadEnv() {
  const envPath = path.resolve(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    for (const line of content.split(/\r?\n/)) {
      const m = line.match(/^\s*([^#=]+)=(.*)$/);
      if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
    }
  }
}

loadEnv();
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('Définissez GEMINI_API_KEY dans .env');
  process.exit(1);
}

const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

async function main() {
  const res = await fetch(url);
  if (!res.ok) {
    console.error('Erreur', res.status, await res.text());
    process.exit(1);
  }
  const data = await res.json();
  const models = data.models || [];
  console.log('Modèles disponibles (v1beta):\n');
  for (const m of models) {
    const name = m.name?.replace('models/', '') || m.name;
    const methods = m.supportedGenerationMethods || [];
    const genContent = methods.includes('generateContent');
    const genImages = methods.includes('generateImages');
    const tag = genImages ? ' [generateImages]' : genContent ? ' [generateContent]' : '';
    console.log(`  ${name}${tag}`);
  }
  console.log('\nPour les images, utilisez un modèle avec [generateContent] et responseModalities IMAGE, ou [generateImages].');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
