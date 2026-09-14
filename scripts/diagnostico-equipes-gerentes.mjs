/**
 * Diagnóstico read-only via Supabase (sem importar libs Next).
 * Uso: node scripts/diagnostico-equipes-gerentes.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

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

function norm(s) {
  return String(s ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

const SETORES_OK = [
  'Cozinha loja',
  'Atendimento',
  'Copa',
  'Caixa',
  'ASG',
  'Fábrica de doces',
  'Fábrica de preparos',
  'Administração',
  'Escritório',
  'CD',
  'Motorista',
  'RH',
  'Supervisão',
  'Marketing',
  'Estoque',
];

function setorValidoExato(s) {
  return SETORES_OK.includes(String(s ?? '').trim());
}

function setorValidoFolga(s) {
  const n = norm(s);
  return SETORES_OK.some((ok) => norm(ok) === n);
}

async function main() {
  loadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase env ausente');
  const sb = createClient(url, key);

  const { data: unidades, error: errU } = await sb.from('unidades').select('id, slug, nome');
  if (errU) throw new Error(errU.message);
  const slugPorId = new Map((unidades ?? []).map((u) => [String(u.id), String(u.slug)]));
  const idPorSlug = new Map((unidades ?? []).map((u) => [String(u.slug), String(u.id)]));

  const { data: cols, error: errC } = await sb
    .from('colaboradores')
    .select('id, nome, role, cargo, unidade_id, setor, tipo_escala, onboarding_completo');
  if (errC) throw new Error(errC.message);

  const { data: lps, error: errL } = await sb
    .from('lideres_por_setor')
    .select('unidade_id, setor, lider_id, ativo');
  if (errL) throw new Error(errL.message);

  const { data: vinculos } = await sb
    .from('colaboradores_lideres')
    .select('colaborador_id, lider_id, ativo')
    .eq('ativo', true);

  const setoresCadastro = {};
  for (const c of cols ?? []) {
    const s = String(c.setor ?? '').trim() || '(vazio)';
    setoresCadastro[s] = (setoresCadastro[s] ?? 0) + 1;
  }

  const setoresLps = {};
  for (const row of lps ?? []) {
    const s = String(row.setor ?? '').trim() || '(vazio)';
    if (!setoresLps[s]) setoresLps[s] = { ativo: 0, inativo: 0 };
    if (row.ativo) setoresLps[s].ativo += 1;
    else setoresLps[s].inativo += 1;
  }

  const gerentes = (cols ?? []).filter((c) => {
    const r = norm(c.role);
    return ['gerente', 'master', 'admin', 'chefe', 'chefia', 'lider', 'lideranca'].includes(r);
  });

  const liderIds = new Set(gerentes.map((c) => String(c.id)));
  for (const row of lps ?? []) {
    if (row.ativo && row.lider_id) liderIds.add(String(row.lider_id));
  }

  const SETORES_FABRICA = ['fabrica de preparos', 'fabrica de doces'];
  const grupoMesquitaIds = ['mesquita', 'fabrica']
    .map((s) => idPorSlug.get(s))
    .filter(Boolean);

  function pessoasDaVaga(unidadeId, setor, excluirId) {
    const setorTrim = String(setor ?? '').trim();
    const nSetor = norm(setorTrim);
    let pool = cols ?? [];
    if (setorTrim === '*') {
      pool = pool.filter((c) => String(c.unidade_id) === String(unidadeId));
      const slug = slugPorId.get(String(unidadeId));
      if (slug && slug !== 'fabrica') {
        pool = pool.filter((c) => !SETORES_FABRICA.includes(norm(c.setor)));
      }
    } else if (SETORES_FABRICA.includes(nSetor)) {
      pool = pool.filter((c) => grupoMesquitaIds.includes(String(c.unidade_id)));
      pool = pool.filter((c) => String(c.setor ?? '').trim() === setorTrim);
    } else {
      pool = pool.filter((c) => String(c.unidade_id) === String(unidadeId));
      pool = pool.filter((c) => String(c.setor ?? '').trim() === setorTrim);
    }
    return pool.filter((c) => {
      if (String(c.id) === String(excluirId)) return false;
      const r = norm(c.role);
      if (r === 'colaborador' || r === '') return true;
      return false;
    });
  }

  function pessoasDaVagaFolga(unidadeId, setor, excluirId) {
    const setorTrim = String(setor ?? '').trim();
    const nSetor = norm(setorTrim);
    let pool = cols ?? [];
    if (setorTrim === '*') {
      pool = pool.filter((c) => String(c.unidade_id) === String(unidadeId));
      const slug = slugPorId.get(String(unidadeId));
      if (slug && slug !== 'fabrica') {
        pool = pool.filter((c) => !SETORES_FABRICA.includes(norm(c.setor)));
      }
    } else if (SETORES_FABRICA.includes(nSetor)) {
      pool = pool.filter((c) => grupoMesquitaIds.includes(String(c.unidade_id)));
      pool = pool.filter((c) => norm(c.setor) === nSetor);
    } else {
      pool = pool.filter((c) => String(c.unidade_id) === String(unidadeId));
      pool = pool.filter((c) => norm(c.setor) === nSetor || (nSetor === 'cd' && norm(c.setor) === 'estoque'));
    }
    return pool.filter((c) => {
      if (String(c.id) === String(excluirId)) return false;
      const r = norm(c.role);
      return r === 'colaborador' || r === '';
    });
  }

  const relatorio = [];
  for (const id of liderIds) {
    const c = (cols ?? []).find((x) => String(x.id) === id);
    if (!c) continue;
    const vagas = (lps ?? []).filter((r) => r.ativo && String(r.lider_id) === id);
    const idsExato = new Set();
    const idsFolga = new Set();
    const vagasDetalhe = [];
    for (const v of vagas) {
      const exato = pessoasDaVaga(v.unidade_id, v.setor, id);
      const folga = pessoasDaVagaFolga(v.unidade_id, v.setor, id);
      for (const p of exato) idsExato.add(String(p.id));
      for (const p of folga) idsFolga.add(String(p.id));
      vagasDetalhe.push({
        unidade: slugPorId.get(String(v.unidade_id)) ?? v.unidade_id,
        setor: v.setor,
        setor_valido_exato: v.setor === '*' || setorValidoExato(v.setor),
        setor_valido_folga: v.setor === '*' || setorValidoFolga(v.setor),
        match_exato: exato.length,
        match_folga: folga.length,
      });
    }

    const vinculosDeste = (vinculos ?? []).filter((v) => String(v.lider_id) === id);
    const unidadeCadastro = c.unidade_id ? String(c.unidade_id) : '';
    const fallbackUnidade = (cols ?? []).filter((p) => {
      if (String(p.id) === id) return false;
      if (String(p.unidade_id) !== unidadeCadastro) return false;
      return norm(p.role) === 'colaborador';
    });

    relatorio.push({
      nome: c.nome,
      role: c.role,
      unidade: slugPorId.get(unidadeCadastro) ?? unidadeCadastro ?? null,
      setor_cadastro: c.setor,
      tipo_escala: c.tipo_escala,
      vagas_n: vagas.length,
      vagas: vagasDetalhe,
      equipe_exata_n: idsExato.size,
      equipe_folga_n: idsFolga.size,
      vinculos_ativos: vinculosDeste.length,
      fallback_unidade_n: fallbackUnidade.length,
      risco:
        vagas.length > 0 && idsExato.size === 0
          ? 'vagas_sem_match'
          : vagas.length === 0 && fallbackUnidade.length === 0
            ? 'sem_vaga_sem_fallback'
            : idsFolga.size > idsExato.size
              ? 'perda_por_grafia'
              : vagas.length === 0
                ? 'so_fallback_cadastro'
                : 'ok',
    });
  }

  relatorio.sort((a, b) => String(a.nome).localeCompare(String(b.nome), 'pt-BR'));

  const saida = {
    gerado_em: new Date().toISOString(),
    setores_no_cadastro: Object.fromEntries(Object.entries(setoresCadastro).sort((a, b) => a[0].localeCompare(b[0], 'pt-BR'))),
    setores_em_lideres_por_setor: Object.fromEntries(
      Object.entries(setoresLps).sort((a, b) => a[0].localeCompare(b[0], 'pt-BR'))
    ),
    riscos: relatorio.filter((r) => r.risco !== 'ok').map((r) => ({ nome: r.nome, risco: r.risco, vagas: r.vagas_n, equipe: r.equipe_exata_n })),
    lideres: relatorio,
  };

  const dest = path.join(__dirname, '_snapshots', 'diagnostico-equipes-gerentes.json');
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, JSON.stringify(saida, null, 2), 'utf8');
  console.log(
    JSON.stringify(
      {
        ok: true,
        lideres: relatorio.length,
        riscos: saida.riscos,
        resumo: relatorio.map((r) => ({
          nome: r.nome,
          role: r.role,
          unidade: r.unidade,
          vagas: r.vagas_n,
          equipe: r.equipe_exata_n,
          folga: r.equipe_folga_n,
          risco: r.risco,
        })),
        setores_cadastro: saida.setores_no_cadastro,
        setores_lps: saida.setores_em_lideres_por_setor,
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error('[diagnostico] ERRO:', e instanceof Error ? e.message : e);
  process.exit(1);
});
