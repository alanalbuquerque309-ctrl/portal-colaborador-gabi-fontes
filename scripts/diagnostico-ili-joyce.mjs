/** ILI aproximado Joyce vs Silvia (disciplina + feedback semana). */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
function loadEnv() {
  const p = path.join(root, '.env.local');
  const raw = fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, '');
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i < 0) continue;
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    process.env[t.slice(0, i).trim()] = v;
  }
}

async function main() {
  loadEnv();
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const ids = {
    joyce: '9fafb159-fe1b-4687-8d2d-a5783df7bd7c',
    silvia: null,
  };
  const { data: silvia } = await sb.from('colaboradores').select('id, nome').ilike('nome', '%Silvia Antunes%').maybeSingle();
  ids.silvia = silvia?.id;

  const { data: lps } = await sb.from('lideres_por_setor').select('lider_id, unidade_id, setor').eq('ativo', true);
  const { data: cols } = await sb.from('colaboradores').select('id, nome, role, unidade_id, setor, onboarding_completo');

  const mesquita = (await sb.from('unidades').select('id').eq('slug', 'mesquita').maybeSingle()).data?.id;
  const equipeMesquita = (cols ?? []).filter((c) => String(c.unidade_id) === String(mesquita) && String(c.role) === 'colaborador');

  const semanaEquipe = '2026-09-07';
  const semanaAtual = '2026-09-14';

  for (const [label, id] of Object.entries(ids)) {
    if (!id) continue;
    const { data: lancadas } = await sb
      .from('avaliacoes_diarias')
      .select('colaborador_id, media_dia, assiduidade, data_referencia')
      .eq('avaliador_id', id)
      .in('data_referencia', [semanaEquipe, semanaAtual]);
    const { data: fb } = await sb
      .from('avaliacoes_lideranca')
      .select('semana_inicio, n_exemplo, n_comunicacao, n_suporte, n_justica, n_clima')
      .eq('avaliado_id', id)
      .in('semana_inicio', [semanaEquipe, semanaAtual, '2026-08-31']);

    const { count: totalFb } = await sb
      .from('avaliacoes_lideranca')
      .select('id', { count: 'exact', head: true })
      .eq('avaliado_id', id);

    console.log(JSON.stringify({
      label,
      equipe_mesquita_colabs: equipeMesquita.length,
      lancadas_semana_07: (lancadas ?? []).filter((r) => r.data_referencia === semanaEquipe).length,
      lancadas_semana_14: (lancadas ?? []).filter((r) => r.data_referencia === semanaAtual).length,
      feedback_por_semana: (fb ?? []).reduce((acc, r) => {
        acc[r.semana_inicio] = (acc[r.semana_inicio] ?? 0) + 1;
        return acc;
      }, {}),
      total_feedback_historico: totalFb,
    }, null, 2));
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
