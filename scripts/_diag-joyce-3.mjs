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
      const i = t.indexOf('=');
      if (i < 0) continue;
      let v = t.slice(i + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      out[t.slice(0, i).trim()] = v;
    }
  }
  return out;
}

const JOYCE = '9fafb159-fe1b-4687-8d2d-a5783df7bd7c';
const NAMES = ['Fábio Alves', 'Verônica', 'Lucas Geova'];
const sb = createClient(readEnv().NEXT_PUBLIC_SUPABASE_URL, readEnv().SUPABASE_SERVICE_ROLE_KEY);

for (const n of NAMES) {
  const { data } = await sb.from('colaboradores').select('id, nome, setor, unidade_id').ilike('nome', `%${n}%`).limit(3);
  for (const c of data ?? []) {
    const { data: avals } = await sb
      .from('avaliacoes_diarias')
      .select('avaliador_id, data_referencia, assiduidade, media_dia, justificativa_nota_baixa, colaboradores:avaliador_id(nome)')
      .eq('colaborador_id', c.id)
      .in('data_referencia', ['2026-07-20', '2026-07-27']);
    console.log('\n', c.nome, c.setor);
    console.log(avals);
  }
}
