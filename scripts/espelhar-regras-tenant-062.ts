/**
 * Copia REGRAS_* do código TS para tenant_settings (migration 062).
 * Uso: npm run db:espelhar-regras-062
 * Requer SUPABASE_SERVICE_ROLE_KEY em .env.local (não precisa DATABASE_URL).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { REGRAS_AVALIACAO_DIRETA } from '../src/lib/config-avaliacao-direta';
import { REGRAS_LIDERANCA_OPERACIONAL } from '../src/lib/config-lideranca-operacional';
import { createAdminClient } from '../src/lib/supabase/admin';

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

  const { data: tenant, error: errT } = await supabase
    .from('tenants')
    .select('id, slug')
    .eq('slug', 'gabi-fontes')
    .eq('ativo', true)
    .maybeSingle();

  if (errT || !tenant?.id) {
    console.error('[db:espelhar-regras-062] Tenant gabi-fontes não encontrado. Aplique a migration 061 primeiro.');
    process.exit(1);
  }

  const { error } = await supabase
    .from('tenant_settings')
    .update({
      regras_lideranca: REGRAS_LIDERANCA_OPERACIONAL,
      regras_avaliacao_direta: REGRAS_AVALIACAO_DIRETA,
      updated_at: new Date().toISOString(),
    })
    .eq('tenant_id', tenant.id);

  if (error) {
    console.error('[db:espelhar-regras-062] ERRO:', error.message);
    if (error.message.includes('regras_lideranca')) {
      console.error('Aplique a migration 062 no SQL Editor antes de espelhar.');
    }
    process.exit(1);
  }

  console.log(
    `[db:espelhar-regras-062] OK — ${REGRAS_LIDERANCA_OPERACIONAL.length} regras liderança, ${REGRAS_AVALIACAO_DIRETA.length} avaliação direta.`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
