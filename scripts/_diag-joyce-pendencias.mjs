/**
 * Diagnóstico: pendências da Joyce (home vs avaliação master).
 */
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
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      out[t.slice(0, i).trim()] = v;
    }
  }
  return out;
}

const env = readEnv();
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const { data: joyce } = await sb
  .from('colaboradores')
  .select('id, nome, role, unidade_id, setor, unidades(slug, nome)')
  .ilike('nome', '%Joyce%')
  .limit(5);

console.log('Joyce matches:', joyce);

const j = (joyce ?? []).find((c) => /joyce/i.test(c.nome) && /azevedo|cruz/i.test(c.nome)) ?? joyce?.[0];
if (!j) {
  console.log('Joyce não encontrada');
  process.exit(1);
}

console.log('Usando:', j.nome, j.id, j.role);

// Import via dynamic path won't work for TS — replicate key queries
const { data: setores } = await sb.from('lideres_por_setor').select('*').eq('lider_id', j.id);
console.log('lideres_por_setor', setores);

// comunicados
const { data: avisos } = await sb
  .from('avisos')
  .select('id, titulo, exige_confirmacao, ativo, publico_alvo')
  .eq('ativo', true)
  .eq('exige_confirmacao', true);

const { data: confAvisos } = await sb
  .from('aviso_confirmacoes')
  .select('aviso_id')
  .eq('colaborador_id', j.id);

const confA = new Set((confAvisos ?? []).map((c) => c.aviso_id));
const avisosPend = (avisos ?? []).filter((a) => !confA.has(a.id));
console.log(
  'avisos pendentes (sem filtro publico):',
  avisosPend.length,
  avisosPend.map((a) => a.titulo)
);

// treinos
const { data: treinos } = await sb
  .from('treinamentos')
  .select('id, titulo, publico_alvo, created_at, ativo')
  .eq('ativo', true)
  .order('created_at', { ascending: false });

const { data: confT } = await sb
  .from('treinamento_confirmacoes')
  .select('treinamento_id')
  .eq('colaborador_id', j.id);

console.log(
  'treinos confirmados joyce:',
  (confT ?? []).length,
  'ultimos treinos:',
  (treinos ?? []).slice(0, 4).map((t) => `${t.titulo} (${t.publico_alvo})`)
);

// Semana avaliação
function segundaSP(d = new Date()) {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = fmt.formatToParts(d);
  const y = parts.find((p) => p.type === 'year').value;
  const m = parts.find((p) => p.type === 'month').value;
  const day = parts.find((p) => p.type === 'day').value;
  const local = new Date(`${y}-${m}-${day}T12:00:00`);
  const dow = local.getDay(); // 0 sun
  const diff = dow === 0 ? -6 : 1 - dow;
  local.setDate(local.getDate() + diff);
  return local.toISOString().slice(0, 10);
}
function segundaAnterior(iso) {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() - 7);
  return d.toISOString().slice(0, 10);
}

const corrente = segundaSP();
const principal = segundaAnterior(corrente);
console.log('semana corrente', corrente, 'semana cobrança (passada)', principal);

const { data: equipeSetor } = await sb
  .from('colaboradores')
  .select('id, nome, role, setor, unidade_id')
  .eq('role', 'colaborador');

console.log('total colaboradores role=', (equipeSetor ?? []).length);

// Check avaliacoes for joyce as avaliador this week
const { data: minhas } = await sb
  .from('avaliacoes_diarias')
  .select('id, colaborador_id, data_referencia, assiduidade, justificativa_nota_baixa')
  .eq('avaliador_id', j.id)
  .in('data_referencia', [principal, corrente]);

console.log('avaliações joyce nas semanas:', minhas?.length);
