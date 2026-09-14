/**
 * Por que a nota da Joyce está baixa (ILI + feedback da equipe).
 * Uso: node scripts/diagnostico-nota-joyce.mjs
 */
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

function mediaPilares(r) {
  const vals = [
    r.n_exemplo ?? r.n_organizacao,
    r.n_comunicacao ?? r.n_fala_escuta,
    r.n_suporte ?? r.n_apoio,
    r.n_justica ?? r.n_organizacao,
    r.n_clima ?? r.n_ambiente,
  ].map((v) => Number(v));
  const ok = vals.filter((n) => !Number.isNaN(n) && n >= 1 && n <= 5);
  if (ok.length === 0) return null;
  return Math.round((ok.reduce((a, b) => a + b, 0) / ok.length) * 100) / 100;
}

function segundaSP(d = new Date()) {
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' });
  const parts = fmt.formatToParts(d);
  const y = Number(parts.find((p) => p.type === 'year').value);
  const m = Number(parts.find((p) => p.type === 'month').value);
  const day = Number(parts.find((p) => p.type === 'day').value);
  const local = new Date(y, m - 1, day);
  const dow = local.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  local.setDate(local.getDate() + diff);
  const yy = local.getFullYear();
  const mm = String(local.getMonth() + 1).padStart(2, '0');
  const dd = String(local.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

function addDays(iso, n) {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + n);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

async function main() {
  loadEnv();
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  const { data: joyce } = await sb
    .from('colaboradores')
    .select('id, nome, role')
    .ilike('nome', '%Joyce Azevedo%')
    .maybeSingle();
  if (!joyce?.id) throw new Error('Joyce não encontrada');

  const { data: gerentes } = await sb
    .from('colaboradores')
    .select('id, nome, role')
    .eq('role', 'gerente');

  const { data: rows, error } = await sb
    .from('avaliacoes_lideranca')
    .select(
      'avaliado_id, avaliador_id, semana_inicio, n_exemplo, n_comunicacao, n_suporte, n_justica, n_clima, n_organizacao, n_fala_escuta, n_apoio, n_ambiente, justificativa_nota_baixa, created_at'
    )
    .order('semana_inicio', { ascending: false })
    .limit(2000);
  if (error) throw new Error(error.message);

  const { data: nomes } = await sb.from('colaboradores').select('id, nome, role, setor, unidade_id');
  const nomePorId = new Map((nomes ?? []).map((c) => [String(c.id), c]));

  const porLider = new Map();
  for (const r of rows ?? []) {
    const lid = String(r.avaliado_id);
    const media = mediaPilares(r);
    if (media == null) continue;
    if (!porLider.has(lid)) porLider.set(lid, []);
    porLider.get(lid).push({ ...r, media });
  }

  function resumo(id, label) {
    const lista = porLider.get(id) ?? [];
    const mes = '2026-09';
    const noMes = lista.filter((r) => String(r.semana_inicio).startsWith(mes));
    const all = lista;
    const avg = (arr) =>
      arr.length ? Math.round((arr.reduce((a, r) => a + r.media, 0) / arr.length) * 100) / 100 : null;
    const dist = (arr) => {
      const d = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
      for (const r of arr) {
        const k = String(Math.round(r.media));
        if (d[k] != null) d[k] += 1;
      }
      return d;
    };
    const pilares = (arr) => {
      if (!arr.length) return null;
      const keys = [
        ['exemplo', 'n_exemplo', 'n_organizacao'],
        ['comunicacao', 'n_comunicacao', 'n_fala_escuta'],
        ['suporte', 'n_suporte', 'n_apoio'],
        ['justica', 'n_justica', 'n_organizacao'],
        ['clima', 'n_clima', 'n_ambiente'],
      ];
      const out = {};
      for (const [nome, a, b] of keys) {
        const vals = arr.map((r) => Number(r[a] ?? r[b])).filter((n) => n >= 1 && n <= 5);
        out[nome] = vals.length ? Math.round((vals.reduce((x, y) => x + y, 0) / vals.length) * 100) / 100 : null;
      }
      return out;
    };
    const porSemana = {};
    for (const r of all) {
      const k = String(r.semana_inicio);
      if (!porSemana[k]) porSemana[k] = [];
      porSemana[k].push(r.media);
    }
    const semanas = Object.entries(porSemana)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 8)
      .map(([semana, medias]) => ({
        semana,
        n: medias.length,
        media: Math.round((medias.reduce((a, b) => a + b, 0) / medias.length) * 100) / 100,
        min: Math.min(...medias),
        max: Math.max(...medias),
      }));
    const baixas = all
      .filter((r) => r.media <= 3)
      .slice(0, 15)
      .map((r) => ({
        semana: r.semana_inicio,
        media: r.media,
        justificativa: r.justificativa_nota_baixa || null,
        avaliador: nomePorId.get(String(r.avaliador_id))?.nome ?? r.avaliador_id,
      }));
    return {
      nome: label,
      total: all.length,
      media_geral: avg(all),
      no_mes_set: { n: noMes.length, media: avg(noMes), pilares: pilares(noMes), dist: dist(noMes) },
      pilares_geral: pilares(all),
      dist_geral: dist(all),
      semanas,
      notas_baixas: baixas,
    };
  }

  const joyceId = String(joyce.id);
  const comparativo = [joyce, ...(gerentes ?? []).filter((g) => g.id !== joyce.id)]
    .map((g) => resumo(String(g.id), g.nome))
    .sort((a, b) => (a.media_geral ?? 0) - (b.media_geral ?? 0));

  const semanaAtual = segundaSP();
  const semanaPassada = addDays(semanaAtual, -7);

  const { data: diariasJoyce } = await sb
    .from('avaliacoes_diarias')
    .select('colaborador_id, avaliador_id, media_dia, data_referencia, assiduidade')
    .eq('avaliador_id', joyceId)
    .in('data_referencia', [semanaAtual, semanaPassada])
    .limit(200);

  const { data: diariasEquipe } = await sb
    .from('avaliacoes_diarias')
    .select('colaborador_id, avaliador_id, media_dia, data_referencia, assiduidade')
    .in('data_referencia', [semanaPassada])
    .limit(2000);

  const saida = {
    joyce_id: joyceId,
    semana_atual_sp: semanaAtual,
    semana_passada_sp: semanaPassada,
    joyce: resumo(joyceId, joyce.nome),
    ranking_media_lideranca: comparativo.map((c) => ({
      nome: c.nome,
      media: c.media_geral,
      n: c.total,
      mes: c.no_mes_set,
    })),
    avaliacoes_que_joyce_lancou: {
      semana_atual: (diariasJoyce ?? []).filter((r) => r.data_referencia === semanaAtual).length,
      semana_passada: (diariasJoyce ?? []).filter((r) => r.data_referencia === semanaPassada).length,
    },
    notas_baixas_joyce: resumo(joyceId, joyce.nome).notas_baixas,
  };

  const dest = path.join(root, 'scripts', '_snapshots', 'diagnostico-nota-joyce.json');
  fs.writeFileSync(dest, JSON.stringify({ ...saida, diarias_joyce: diariasJoyce, diarias_equipe_semana_passada_n: (diariasEquipe ?? []).length }, null, 2), 'utf8');
  console.log(JSON.stringify(saida, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
