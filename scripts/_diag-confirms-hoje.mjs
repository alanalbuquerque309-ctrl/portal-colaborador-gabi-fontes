import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
function readEnv() {
  const out = {};
  for (const name of ['.env.local', '.env']) {
    const p = path.join(root, name);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const m = t.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+)$/);
      if (!m) continue;
      let v = m[2].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      out[m[1]] = v;
    }
  }
  return out;
}

const env = readEnv();
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const ids = ['c6753f42-1892-46bd-80f7-0a6cbc4b37f0', '9942f51c-f9d8-4d44-9f95-e9cea46a9547'];

const { data: conf } = await sb
  .from('treinamento_confirmacoes')
  .select('treinamento_id, colaborador_id, confirmado_em')
  .in('treinamento_id', ids);

const colabIds = [...new Set((conf ?? []).map((c) => c.colaborador_id))];
const { data: colabs } = await sb.from('colaboradores').select('id, nome, role').in('id', colabIds);
const byId = new Map((colabs ?? []).map((c) => [c.id, c]));

console.log(
  (conf ?? []).map((c) => ({
    treino: c.treinamento_id.slice(0, 8),
    nome: byId.get(c.colaborador_id)?.nome,
    role: byId.get(c.colaborador_id)?.role,
    em: c.confirmado_em,
  }))
);
console.log('total', conf?.length ?? 0);
