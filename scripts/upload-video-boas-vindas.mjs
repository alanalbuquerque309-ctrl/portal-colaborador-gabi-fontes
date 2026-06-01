/**
 * Envia public/onboarding/boas-vindas.mp4 para Supabase Storage (bucket público portal-onboarding).
 * Uso: npm run upload:video-boas-vindas
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const portalRoot = path.join(__dirname, '..');
const videoPath = path.join(portalRoot, 'public', 'onboarding', 'boas-vindas.mp4');
const BUCKET = 'portal-onboarding';
const OBJECT = 'boas-vindas.mp4';

function loadEnv() {
  const out = {};
  for (const name of ['.env.local', '.env']) {
    const p = path.join(portalRoot, name);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (m) out[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
    }
  }
  return { ...out, ...process.env };
}

const env = loadEnv();
const url = String(env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim();
const key = String(env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim();

if (!url || !key) {
  console.error('Faltam NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY em .env.local');
  process.exit(1);
}

if (!fs.existsSync(videoPath)) {
  console.error(`Arquivo não encontrado: ${videoPath}`);
  process.exit(1);
}

const supabase = createClient(url, key);
const buffer = fs.readFileSync(videoPath);
const sizeMb = (buffer.length / (1024 * 1024)).toFixed(1);

const { data: buckets } = await supabase.storage.listBuckets();
if (!buckets?.some((b) => b.name === BUCKET)) {
  const { error: createErr } = await supabase.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: 50 * 1024 * 1024,
  });
  if (createErr) {
    console.error(`Erro ao criar bucket "${BUCKET}":`, createErr.message);
    process.exit(1);
  }
  console.log(`Bucket "${BUCKET}" criado (público).`);
}

const { error: uploadErr } = await supabase.storage.from(BUCKET).upload(OBJECT, buffer, {
  upsert: true,
  contentType: 'video/mp4',
  cacheControl: '3600',
});

if (uploadErr) {
  console.error('Upload falhou:', uploadErr.message);
  process.exit(1);
}

const publicUrl = `${url.replace(/\/+$/, '')}/storage/v1/object/public/${BUCKET}/${OBJECT}`;
console.log(`Upload OK (${sizeMb} MB).`);
console.log('URL pública:', publicUrl);
console.log('');
console.log('O portal usa esta URL automaticamente via NEXT_PUBLIC_SUPABASE_URL (sem env extra).');
console.log('Opcional na Vercel: NEXT_PUBLIC_VIDEO_BOAS_VINDAS=' + publicUrl);
