/**
 * Serveur local Option 3 (génération d'images self-hosted : Stable Diffusion / ComfyUI).
 * Contrat app : POST /generate avec JSON { prompt, referenceImageBase64?, referenceImageMime? }
 * Réponse : image/png (binaire) ou JSON { imageBase64 }.
 *
 * Si STABLE_DIFFUSION_URL est défini dans .env (ex. http://127.0.0.1:7860), appelle
 * l’API Stable Diffusion WebUI (A1111 / Forge) en txt2img ou img2img. Sinon placeholder.
 */

const http = require('http');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

// Charger .env depuis la racine du projet (dossier parent de scripts/ pour être fiable)
function loadEnv() {
  const projectRoot = path.resolve(__dirname, '..');
  const envPath = path.join(projectRoot, '.env');
  try {
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      content.split(/\r?\n/).forEach((line) => {
        const m = line.match(/^([^#=]+)=(.*)$/);
        if (m) {
          const key = m[1].trim().replace(/\r/g, '');
          const val = m[2].trim().replace(/\r/g, '').replace(/^["']|["']$/g, '');
          if (key) process.env[key] = val;
        }
      });
    }
  } catch (e) {
    console.warn('[local-image-server] Impossible de charger .env:', e.message);
  }
}
loadEnv();

const PORT = Number(process.env.LOCAL_IMAGE_PORT) || 8188;
const SD_URL = (process.env.STABLE_DIFFUSION_URL || process.env.LOCAL_SD_URL || '').replace(/\/$/, '');
const FORGE_PATH = process.env.FORGE_PATH && process.env.FORGE_PATH.trim();

function isConnectionError(e) {
  const msg = (e && e.message) || String(e);
  const cause = e && e.cause && (e.cause.message || String(e.cause));
  const full = [msg, cause].filter(Boolean).join(' ');
  return /fetch failed|ECONNREFUSED|ENOTFOUND|network|refused|connection/i.test(full);
}

function startForge() {
  if (!FORGE_PATH) return;
  const forgeDir = path.resolve(FORGE_PATH);
  const runBat = path.join(forgeDir, 'run.bat');
  if (!fs.existsSync(runBat)) {
    console.warn('[local-image-server] FORGE_PATH invalide (run.bat introuvable):', runBat);
    return;
  }
  console.log('[local-image-server] Démarrage de Forge à la demande...');
  const script = process.platform === 'win32' ? 'run.bat' : './webui.sh';
  const child = spawn(script, [], { cwd: forgeDir, shell: true, detached: true, stdio: 'ignore' });
  child.unref();
}

function waitForSdReady(maxWaitMs = 300000, intervalMs = 5000) {
  const baseUrl = SD_URL.replace(/\/$/, '');
  return new Promise((resolve, reject) => {
    const start = Date.now();
    function check() {
      fetch(baseUrl, { method: 'GET', signal: AbortSignal.timeout(3000) })
        .then(() => resolve())
        .catch(() => {
          if (Date.now() - start >= maxWaitMs) {
            reject(new Error('Forge ne répond pas après ' + maxWaitMs / 1000 + ' s'));
            return;
          }
          setTimeout(check, intervalMs);
        });
    }
    check();
  });
}

// PNG 1x1 (fallback si sharp indisponible)
const FALLBACK_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);

async function createPlaceholderBuffer() {
  try {
    const sharp = require('sharp');
    const width = 512;
    const height = 512;
    const svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#f5f0e8"/>
        <text x="50%" y="50%" font-family="sans-serif" font-size="24" fill="#8a8378" text-anchor="middle" dy=".35em">Illustration (mode local)</text>
        <text x="50%" y="58%" font-family="sans-serif" font-size="14" fill="#b0a99a" text-anchor="middle" dy=".35em">Placeholder — définissez STABLE_DIFFUSION_URL dans .env</text>
      </svg>
    `;
    return await sharp(Buffer.from(svg))
      .png()
      .toBuffer();
  } catch (e) {
    console.warn('[local-image-server] sharp non disponible, utilisation du fallback 1x1:', e.message);
    return FALLBACK_PNG;
  }
}

/** Appel Stable Diffusion WebUI (A1111 / Forge) : txt2img ou img2img. */
async function generateWithStableDiffusion(data) {
  const prompt = data.prompt || '';
  const refB64 = data.referenceImageBase64;
  const isImg2Img = !!refB64;
  const endpoint = isImg2Img ? '/sdapi/v1/img2img' : '/sdapi/v1/txt2img';
  const url = SD_URL + endpoint;

  const body = {
    prompt,
    negative_prompt: 'ugly, blurry, low quality, text, watermark',
    steps: 20,
    width: 512,
    height: 512,
    cfg_scale: 7,
    sampler_name: 'Euler a',
  };
  if (isImg2Img) {
    body.init_images = [refB64];
    body.denoising_strength = 0.75;
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Stable Diffusion API ${res.status}: ${text.slice(0, 200)}`);
  }
  const json = await res.json();
  const b64 = json.images && json.images[0];
  if (!b64) throw new Error('Stable Diffusion n\'a pas renvoyé d\'image');
  return Buffer.from(b64, 'base64');
}

let cachedPlaceholder = null;

const server = http.createServer((req, res) => {
  if (req.method !== 'POST' || req.url !== '/generate') {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found. POST /generate with JSON { prompt, referenceImageBase64?, referenceImageMime? }');
    return;
  }

  let body = '';
  req.on('data', (chunk) => { body += chunk; });
  req.on('end', async () => {
    try {
      const data = JSON.parse(body);
      const prompt = data.prompt || '';
      const hasRef = !!data.referenceImageBase64;

      console.log('[local-image-server] prompt:', prompt.slice(0, 80) + (prompt.length > 80 ? '...' : ''), '| ref:', hasRef);

      let buffer;
      if (SD_URL) {
        try {
          buffer = await generateWithStableDiffusion(data);
        } catch (e) {
          if (isConnectionError(e) && FORGE_PATH) {
            console.log('[local-image-server] Forge pas démarré, démarrage puis nouvel essai...');
            startForge();
            try {
              await waitForSdReady();
              buffer = await generateWithStableDiffusion(data);
            } catch (e2) {
              console.error('[local-image-server] SD erreur après démarrage Forge:', e2.message);
              buffer = cachedPlaceholder || await createPlaceholderBuffer();
              if (!cachedPlaceholder) cachedPlaceholder = buffer;
            }
          } else {
            console.error('[local-image-server] SD erreur:', e.message);
            buffer = cachedPlaceholder || await createPlaceholderBuffer();
            if (!cachedPlaceholder) cachedPlaceholder = buffer;
          }
        }
      } else {
        buffer = cachedPlaceholder || await createPlaceholderBuffer();
        if (!cachedPlaceholder) cachedPlaceholder = buffer;
      }

      res.writeHead(200, { 'Content-Type': 'image/png' });
      res.end(buffer);
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: String(e.message) }));
    }
  });
});

server.listen(PORT, () => {
  console.log(`[local-image-server] http://localhost:${PORT}/generate`);
  if (SD_URL) {
    console.log('[local-image-server] STABLE_DIFFUSION_URL =', SD_URL, '| FORGE_PATH =', FORGE_PATH ? 'défini' : 'non défini');
  } else {
    console.log('[local-image-server] STABLE_DIFFUSION_URL non défini → placeholder. Définissez-le dans .env');
  }
});
