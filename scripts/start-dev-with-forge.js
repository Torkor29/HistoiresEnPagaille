/**
 * Lance Forge (si FORGE_PATH est défini), attend que l'API réponde, puis lance l'app (next + local-image-server).
 * Ordre : 1) Forge sur 7860, 2) Next.js + serveur local images sur 8188.
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  try {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split('\n').forEach((line) => {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
    });
  } catch (_) {}
}
loadEnv();

const FORGE_PATH = process.env.FORGE_PATH && process.env.FORGE_PATH.trim();
const SD_URL = process.env.STABLE_DIFFUSION_URL || 'http://127.0.0.1:7860';
const port = (() => {
  try {
    const u = new URL(SD_URL);
    return u.port || (u.protocol === 'https:' ? 443 : 80);
  } catch (_) {
    return 7860;
  }
})();

function waitForForge(maxWaitMs = 300000, intervalMs = 5000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    function check() {
      fetch(SD_URL, { method: 'GET', signal: AbortSignal.timeout(3000) })
        .then(() => resolve())
        .catch(() => {
          if (Date.now() - start >= maxWaitMs) {
            reject(new Error(`Forge ne répond pas après ${maxWaitMs / 1000}s. Vérifiez que run.bat a bien démarré.`));
            return;
          }
          console.log('[start-dev-with-forge] En attente de Forge...');
          setTimeout(check, intervalMs);
        });
    }
    check();
  });
}

function startForge() {
  const forgeDir = path.resolve(FORGE_PATH);
  const runBat = path.join(forgeDir, 'run.bat');
  if (!fs.existsSync(runBat)) {
    console.error('[start-dev-with-forge] Fichier introuvable:', runBat);
    console.error('Vérifiez FORGE_PATH dans .env (dossier contenant run.bat).');
    process.exit(1);
  }
  console.log('[start-dev-with-forge] Démarrage de Forge (une fenêtre peut s\'ouvrir)...');
  const script = process.platform === 'win32' ? 'run.bat' : './webui.sh';
  const child = spawn(script, [], {
    cwd: forgeDir,
    shell: true,
    detached: true,
    stdio: 'ignore',
  });
  child.unref();
}

function runDev() {
  console.log('[start-dev-with-forge] Lancement de l\'app (Next.js + serveur images)...');
  const child = spawn('npm', ['run', 'dev'], { stdio: 'inherit', shell: true, cwd: process.cwd() });
  child.on('exit', (code) => process.exit(code != null ? code : 0));
}

async function main() {
  if (FORGE_PATH) {
    startForge();
    await waitForForge();
    console.log('[start-dev-with-forge] Forge prêt.');
  } else {
    console.log('[start-dev-with-forge] FORGE_PATH non défini — démarrage direct de l\'app.');
  }
  runDev();
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
