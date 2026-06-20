/** Valida pendências Tiago Ventura após correção. */
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
for (const f of ['.env.local', '.env']) {
  const p = resolve(root, f);
  if (!existsSync(p)) continue;
  for (const line of readFileSync(p, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
  }
}

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const FORA = 'Fora do plantão deste líder (outro líder avalia nesta semana).';
function assiduidadeDoBanco(stored, justificativa) {
  const s = String(stored ?? '').trim();
  const j = String(justificativa ?? '').trim();
  if (s === 'falta_justificada' && j === FORA) return 'fora_plantao';
  return s;
}

const { data: avs } = await sb
  .from('avaliacoes_diarias')
  .select('avaliador_id, assiduidade, justificativa_nota_baixa, media_dia, colaboradores:avaliador_id(nome)')
  .eq('colaborador_id', '51a8ce5e-93f2-48f9-b96d-9ef885d57cde')
  .eq('data_referencia', '2026-06-08');

console.log('Semana 08/06 após correção:');
for (const r of avs ?? []) {
  const av = r.colaboradores;
  const nome = Array.isArray(av) ? av[0]?.nome : av?.nome;
  console.log(' -', nome, assiduidadeDoBanco(r.assiduidade, r.justificativa_nota_baixa), 'media', r.media_dia);
}
