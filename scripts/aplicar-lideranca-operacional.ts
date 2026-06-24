/**
 * Aplica mapa operacional (config-lideranca-operacional.ts) no Supabase.
 * Uso: npm run lideranca:aplicar
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createAdminClient } from '../src/lib/supabase/admin';
import { aplicarConfigLiderancaOperacional } from '../src/lib/aplicar-config-lideranca';
import { sincronizarVinculosTodosColaboradores } from '../src/lib/sincronizar-vinculos-lideranca';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

function loadEnv() {
  for (const name of ['.env.local', '.env']) {
    const p = path.join(root, name);
    if (!fs.existsSync(p)) continue;
    const raw = fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, '');
    for (const line of raw.split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const i = t.indexOf('=');
      if (i < 0) continue;
      let v = t.slice(i + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      process.env[t.slice(0, i).trim()] = v;
    }
  }
}

async function main() {
  loadEnv();
  const supabase = createAdminClient();
  const config = await aplicarConfigLiderancaOperacional(supabase);
  const vinculos = await sincronizarVinculosTodosColaboradores(supabase);
  console.log(JSON.stringify({ ok: true, config, vinculos }, null, 2));
}

main().catch((e) => {
  console.error('[lideranca:aplicar] ERRO:', e instanceof Error ? e.message : e);
  process.exit(1);
});
