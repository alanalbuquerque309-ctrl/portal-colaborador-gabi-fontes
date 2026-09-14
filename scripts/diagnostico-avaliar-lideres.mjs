/**
 * Quem cada pessoa veria em Avaliação de liderança (só config, sem plantão).
 * Uso: node scripts/diagnostico-avaliar-lideres.mjs
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

const BACKOFFICE = ['administracao', 'escritorio', 'cd', 'estoque', 'motorista', 'rh'];
const FABRICA = ['fabrica de preparos', 'fabrica de doces'];

function adminTransversal(role, cargo) {
  if (roleNorm(role) === 'admin') return true;
  const c = norm(cargo);
  return c.includes('administrador') || c.includes('adminisrtador');
}

async function main() {
  loadEnv();
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  const { data: unidades, error: errU } = await sb.from('unidades').select('id, slug');
  if (errU) throw new Error(errU.message);
  const slugPorId = new Map((unidades ?? []).map((u) => [String(u.id), String(u.slug)]));
  const idPorSlug = new Map((unidades ?? []).map((u) => [String(u.slug), String(u.id)]));
  const fabricaId = idPorSlug.get('fabrica');

  const { data: cols, error: errC } = await sb
    .from('colaboradores')
    .select('id, nome, role, cargo, unidade_id, setor, lider_id');
  if (errC) throw new Error(errC.message);

  const { data: lps, error: errL } = await sb
    .from('lideres_por_setor')
    .select('unidade_id, setor, lider_id, ativo');
  if (errL) throw new Error(errL.message);
  const ativos = (lps ?? []).filter((r) => r.ativo);

  const byId = new Map((cols ?? []).map((c) => [String(c.id), c]));
  const rh = (cols ?? []).find((c) => roleNorm(c.role) === 'rh');
  const admin = (cols ?? []).find((c) => roleNorm(c.role) === 'admin');

  function lideresDaPessoa(c) {
    const uid = String(c.unidade_id ?? '');
    const setor = String(c.setor ?? '').trim();
    const nSetor = norm(setor);
    const fabrica = FABRICA.includes(nSetor);
    const uidLideranca = fabrica && fabricaId ? fabricaId : uid;
    const ids = new Set();

    for (const v of ativos) {
      const vUid = String(v.unidade_id);
      const vSetor = String(v.setor ?? '').trim();
      if (fabrica) {
        if (vUid === uidLideranca && norm(vSetor) === nSetor) ids.add(String(v.lider_id));
      } else {
        if (vUid === uid && (vSetor === '*' || norm(vSetor) === nSetor || (nSetor === 'estoque' && norm(vSetor) === 'cd'))) {
          ids.add(String(v.lider_id));
        }
      }
    }

    const nomes = [];
    for (const id of ids) {
      if (id === String(c.id)) continue;
      const lider = byId.get(id);
      if (!lider) continue;
      if (adminTransversal(lider.role, lider.cargo) && !BACKOFFICE.includes(nSetor)) continue;
      nomes.push(String(lider.nome));
    }
    return nomes.sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }

  const linhas = [];
  for (const c of cols ?? []) {
    const rn = roleNorm(c.role);
    const apiPermite = rn === 'colaborador' || rn === 'admin';
    const chefes = lideresDaPessoa(c);
    const extra = [];
    if (apiPermite && rn === 'colaborador' && rh && String(rh.id) !== String(c.id)) {
      extra.push(`${rh.nome} (RH)`);
    }
    if (
      apiPermite &&
      rn === 'colaborador' &&
      admin &&
      String(admin.id) !== String(c.id) &&
      BACKOFFICE.includes(norm(c.setor)) &&
      !chefes.includes(String(admin.nome))
    ) {
      extra.push(`${admin.nome} (admin)`);
    }
    linhas.push({
      nome: c.nome,
      role: rn,
      unidade: slugPorId.get(String(c.unidade_id ?? '')) ?? null,
      setor: c.setor,
      api_permite: apiPermite,
      chefes,
      extras: extra,
      sem_chefe_direto: chefes.length === 0,
    });
  }

  linhas.sort((a, b) => String(a.unidade).localeCompare(String(b.unidade), 'pt-BR') || a.nome.localeCompare(b.nome, 'pt-BR'));

  const gerentes = linhas.filter((l) => l.role === 'gerente' || l.role === 'master');
  const colabs = linhas.filter((l) => l.role === 'colaborador');
  const colabsSemChefe = colabs.filter((l) => l.sem_chefe_direto);

  const saida = {
    regra_api: 'só colaborador e admin entram em /avaliacao-lideranca',
    gerentes_bloqueados: gerentes.map((g) => ({
      nome: g.nome,
      unidade: g.unidade,
      setor: g.setor,
      veriam_se_liberado: g.chefes,
    })),
    colaboradores: colabs.length,
    colaboradores_sem_chefe_direto: colabsSemChefe,
    amostra_por_unidade: colabs.reduce((acc, l) => {
      const k = l.unidade || '?';
      if (!acc[k]) acc[k] = [];
      if (acc[k].length < 4) acc[k].push({ nome: l.nome, setor: l.setor, chefes: l.chefes, extras: l.extras });
      return acc;
    }, {}),
  };

  const dest = path.join(__dirname, '_snapshots', 'diagnostico-avaliar-lideres.json');
  fs.writeFileSync(dest, JSON.stringify({ ...saida, todos: linhas }, null, 2), 'utf8');
  console.log(JSON.stringify(saida, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
