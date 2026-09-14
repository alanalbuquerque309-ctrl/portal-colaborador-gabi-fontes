/**
 * Cobertura: quem não tem líder, supervisão, headcount por unidade.
 * Uso: node scripts/diagnostico-equipes-cobertura.mjs
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

function roleNorm(role) {
  const r = norm(role);
  if (['admin', 'administrador', 'administradora'].includes(r)) return 'admin';
  if (['gerente', 'chefe', 'chefia', 'lider', 'lideranca'].includes(r)) return 'gerente';
  if (r === 'master') return 'master';
  if (r === 'rh') return 'rh';
  if (r === 'socio') return 'socio';
  return r || 'colaborador';
}

async function main() {
  loadEnv();
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  const { data: unidades, error: errU } = await sb.from('unidades').select('id, slug, nome');
  if (errU) throw new Error(errU.message);
  const slugPorId = new Map((unidades ?? []).map((u) => [String(u.id), String(u.slug)]));

  const { data: cols, error: errC } = await sb
    .from('colaboradores')
    .select('id, nome, role, cargo, unidade_id, setor, tipo_escala');
  if (errC) throw new Error(errC.message);

  const { data: lps, error: errL } = await sb
    .from('lideres_por_setor')
    .select('unidade_id, setor, lider_id, ativo');
  if (errL) throw new Error(errL.message);

  const lpsAtivo = (lps ?? []).filter((r) => r.ativo);
  const liderIds = new Set(lpsAtivo.map((r) => String(r.lider_id)));

  const porUnidade = {};
  for (const c of cols ?? []) {
    const slug = slugPorId.get(String(c.unidade_id ?? '')) ?? '(sem unidade)';
    if (!porUnidade[slug]) porUnidade[slug] = { total: 0, colaborador: 0, gerente: 0, outros: 0, homeoffice: 0 };
    porUnidade[slug].total += 1;
    const rn = roleNorm(c.role);
    if (rn === 'colaborador') porUnidade[slug].colaborador += 1;
    else if (rn === 'gerente' || rn === 'master') porUnidade[slug].gerente += 1;
    else porUnidade[slug].outros += 1;
    const te = norm(c.tipo_escala).replace(/[\s_-]+/g, '');
    if (te === 'homeoffice' || te === 'remoto' || te === 'teletrabalho') porUnidade[slug].homeoffice += 1;
  }

  const supervisao = (cols ?? [])
    .filter((c) => norm(c.setor) === 'supervisao')
    .map((c) => ({
      nome: c.nome,
      role: c.role,
      cargo: c.cargo,
      unidade: slugPorId.get(String(c.unidade_id ?? '')) ?? null,
      lider_no_mapa: liderIds.has(String(c.id)),
      tipo_escala: c.tipo_escala,
    }))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

  const cargoLiderRoleNao = (cols ?? [])
    .filter((c) => {
      const cargo = norm(c.cargo);
      const pareceLider =
        cargo.includes('gerente') ||
        cargo.includes('chefe') ||
        cargo.includes('lider') ||
        cargo.includes('supervis');
      return pareceLider && !['gerente', 'master', 'admin'].includes(roleNorm(c.role));
    })
    .map((c) => ({
      nome: c.nome,
      role: c.role,
      cargo: c.cargo,
      setor: c.setor,
      unidade: slugPorId.get(String(c.unidade_id ?? '')) ?? null,
      lider_no_mapa: liderIds.has(String(c.id)),
    }));

  const SETORES_FABRICA = ['fabrica de preparos', 'fabrica de doces'];

  function cobertoPorMapa(c) {
    const uid = String(c.unidade_id ?? '');
    const setor = String(c.setor ?? '').trim();
    const nSetor = norm(setor);
    for (const v of lpsAtivo) {
      if (String(v.lider_id) === String(c.id)) continue;
      if (v.setor === '*') {
        if (String(v.unidade_id) === uid && !SETORES_FABRICA.includes(nSetor)) return true;
      } else if (norm(v.setor) === nSetor) {
        if (SETORES_FABRICA.includes(nSetor)) return true;
        if (String(v.unidade_id) === uid) return true;
        if (norm(v.setor) === 'cd' && nSetor === 'estoque') return true;
      } else if (norm(v.setor) === 'cd' && nSetor === 'estoque') {
        return true;
      }
    }
    return false;
  }

  const semLider = (cols ?? [])
    .filter((c) => roleNorm(c.role) === 'colaborador' && !cobertoPorMapa(c))
    .map((c) => ({
      nome: c.nome,
      setor: c.setor,
      unidade: slugPorId.get(String(c.unidade_id ?? '')) ?? null,
      role: c.role,
      cargo: c.cargo,
      tipo_escala: c.tipo_escala,
    }))
    .sort((a, b) => String(a.unidade).localeCompare(String(b.unidade), 'pt-BR') || a.nome.localeCompare(b.nome, 'pt-BR'));

  const homeoffice = (cols ?? [])
    .filter((c) => {
      const te = norm(c.tipo_escala).replace(/[\s_-]+/g, '');
      return te === 'homeoffice' || te === 'remoto' || te === 'teletrabalho';
    })
    .map((c) => ({
      nome: c.nome,
      role: c.role,
      setor: c.setor,
      unidade: slugPorId.get(String(c.unidade_id ?? '')) ?? null,
    }));

  const saida = {
    por_unidade: porUnidade,
    supervisao,
    cargo_lider_role_nao_gerente: cargoLiderRoleNao,
    colaboradores_sem_lider_no_mapa: semLider,
    homeoffice,
  };

  const dest = path.join(__dirname, '_snapshots', 'diagnostico-equipes-cobertura.json');
  fs.writeFileSync(dest, JSON.stringify(saida, null, 2), 'utf8');
  console.log(
    JSON.stringify(
      {
        por_unidade: porUnidade,
        supervisao,
        cargo_lider_role_nao_gerente: cargoLiderRoleNao,
        sem_lider_n: semLider.length,
        sem_lider: semLider,
        homeoffice,
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
