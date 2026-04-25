/**
 * Copia `manuals/` → `public/manuais` antes do build (Vercel inclui `public/` no artefacto).
 * Garante que HTML e assets (ex.: logo) existem mesmo se a pasta raiz `manuals/` falhar no runtime.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const src = path.join(root, 'manuals');
const dest = path.join(root, 'public', 'manuais');

if (!fs.existsSync(src)) {
  console.warn('[sync-manuals-to-public] Pasta manuals/ não encontrada — skip.');
  process.exit(0);
}

fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.cpSync(src, dest, { recursive: true });
console.log('[sync-manuals-to-public] OK:', src, '→', dest);
