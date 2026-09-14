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

function arquivado(row, rows) {
  const publico = String(row.publico_alvo ?? '');
  if (!publico) return false;
  return rows.some(
    (r) =>
      r.ativo !== false &&
      String(r.id) !== String(row.id) &&
      r.publico_alvo === publico &&
      String(r.created_at) > String(row.created_at)
  );
}

const env = readEnv();
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const alanId = '78db7f2d-8ee9-4124-aad9-fa688983d995';

const { data: rows } = await sb
  .from('treinamentos')
  .select('id, titulo, publico_alvo, tipo_conteudo, created_at, ativo, exige_confirmacao')
  .eq('ativo', true)
  .order('created_at', { ascending: false });

const ids = (rows ?? []).map((r) => r.id);
const { data: conf } = await sb
  .from('treinamento_confirmacoes')
  .select('treinamento_id')
  .eq('colaborador_id', alanId)
  .in('treinamento_id', ids);

const confSet = new Set((conf ?? []).map((c) => c.treinamento_id));

const semana = [];
const historico = [];
for (const r of rows ?? []) {
  const arq = arquivado(r, rows);
  const item = {
    titulo: r.titulo,
    publico: r.publico_alvo,
    arquivado: arq,
    confirmado: confSet.has(r.id),
    created_at: r.created_at,
  };
  if (arq) historico.push(item);
  else semana.push(item);
}

console.log('SEMANA', semana.length, semana);
console.log(
  'concluidos',
  semana.filter((t) => t.confirmado).length,
  'de',
  semana.length
);
console.log('HISTORICO count', historico.length);
