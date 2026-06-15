/** Diagnóstico: avaliações de liderança são anônimas? Conta anonimo true/false e lista por avaliador. */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

function loadEnv() {
  const out = {};
  for (const name of ['.env.local', '.env']) {
    const p = path.join(root, name);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (m) out[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
    }
  }
  return { ...out, ...process.env };
}

const env = loadEnv();
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const { data, error } = await supabase
  .from('avaliacoes_lideranca')
  .select('id, anonimo, avaliador_id, avaliado_id, semana_inicio, created_at')
  .order('created_at', { ascending: false });

if (error) {
  console.error('Erro:', error.message);
  process.exit(1);
}

const total = data.length;
const anon = data.filter((r) => r.anonimo === true || r.anonimo === 'true').length;
const naoAnon = data.filter((r) => r.anonimo === false || r.anonimo === 'false').length;
const nulo = total - anon - naoAnon;

console.log(`Total de avaliações de liderança: ${total}`);
console.log(`  anônimas (anonimo=true): ${anon}`);
console.log(`  identificadas (anonimo=false): ${naoAnon}`);
console.log(`  sem flag (null/outro): ${nulo}`);

const ids = Array.from(
  new Set(data.flatMap((r) => [r.avaliador_id, r.avaliado_id].filter(Boolean)))
);
const nomePorId = {};
if (ids.length) {
  const { data: pessoas } = await supabase.from('colaboradores').select('id, nome').in('id', ids);
  for (const p of pessoas ?? []) nomePorId[p.id] = p.nome;
}

console.log('\nÚltimas avaliações:');
for (const r of data.slice(0, 25)) {
  const quem = nomePorId[r.avaliador_id] ?? r.avaliador_id ?? '—';
  const alvo = nomePorId[r.avaliado_id] ?? r.avaliado_id ?? '—';
  console.log(`  ${r.semana_inicio} | ${quem} -> ${alvo} | anonimo=${r.anonimo}`);
}
