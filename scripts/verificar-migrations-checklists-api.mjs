/**
 * Verifica migrations 067/068/069 via Supabase API (sem DATABASE_URL).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const portalRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

function loadEnv() {
  const out = {};
  for (const name of ['.env.local', '.env']) {
    const p = path.join(portalRoot, name);
    if (!fs.existsSync(p)) continue;
    let raw = fs.readFileSync(p, 'utf8');
    if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);
    for (const line of raw.split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const i = t.indexOf('=');
      if (i <= 0) continue;
      const k = t.slice(0, i).trim();
      let v = t.slice(i + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      if (!(k in out)) out[k] = v;
    }
  }
  return out;
}

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Faltam NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY em .env.local');
  process.exit(2);
}

const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

async function tabelaExiste(nome) {
  const sel = await supabase.from(nome).select('id').limit(1);
  if (!sel.error) {
    const { count } = await supabase.from(nome).select('*', { head: true, count: 'exact' });
    return { ok: true, count: count ?? 0 };
  }
  return { ok: false, erro: sel.error.message, codigo: sel.error.code ?? null };
}

async function setorPermitido(setor) {
  const { data: unidade } = await supabase.from('unidades').select('id').eq('slug', 'mesquita').maybeSingle();
  if (!unidade?.id) return { testavel: false, motivo: 'unidade mesquita nao encontrada' };

  const { data: colab } = await supabase.from('colaboradores').select('id').limit(1).maybeSingle();
  if (!colab?.id) return { testavel: false, motivo: 'nenhum colaborador para teste' };

  const payload = {
    unidade_id: unidade.id,
    setor,
    dia_semana: 1,
    colaborador_id: colab.id,
    status: 'pendente',
    observacoes: '__migration_probe__',
  };

  const { error } = await supabase.from('checklists_vistoria_gerencia').insert(payload);
  if (!error) {
    await supabase
      .from('checklists_vistoria_gerencia')
      .delete()
      .eq('unidade_id', unidade.id)
      .eq('setor', setor)
      .eq('dia_semana', 1);
    return { permitido: true };
  }

  const msg = error.message.toLowerCase();
  if (msg.includes('check') || msg.includes('violates') || msg.includes('constraint')) {
    return { permitido: false, erro: error.message };
  }
  return { permitido: null, erro: error.message };
}

console.log('=== Checklist migrations (Supabase prod) ===');

const op = await tabelaExiste('checklists_operacionais');
console.log(
  '067 checklists_operacionais:',
  op.ok ? `OK (${op.count} registros)` : `FALTA [${op.codigo}] ${op.erro}`
);

const vis = await tabelaExiste('checklists_vistoria_gerencia');
console.log(
  '068 checklists_vistoria_gerencia:',
  vis.ok ? `OK (${vis.count} registros)` : `FALTA [${vis.codigo}] ${vis.erro}`
);

if (vis.ok) {
  const probeSetores = ['estoque', 'balcao', 'caixa'];
  const resultados = {};
  for (const s of probeSetores) {
    resultados[s] = await setorPermitido(s);
  }

  const balcaoOk = resultados.balcao.permitido === true;
  const caixaOk = resultados.caixa.permitido === true;
  const estoqueOk = resultados.estoque.permitido === true;

  console.log('Probe setor estoque:', estoqueOk ? 'OK' : resultados.estoque.erro ?? resultados.estoque.motivo);
  console.log('Probe setor balcao:', balcaoOk ? 'OK' : resultados.balcao.erro ?? resultados.balcao.motivo);
  console.log('Probe setor caixa:', caixaOk ? 'OK' : resultados.caixa.erro ?? resultados.caixa.motivo);

  if (balcaoOk && caixaOk) {
    console.log('069 balcao+caixa:', 'OK');
  } else if (estoqueOk && !balcaoOk && !caixaOk) {
    console.log('069 balcao+caixa:', 'FALTA — rode npm run db:apply-069');
  } else {
    console.log('069 balcao+caixa:', 'REVISAR manualmente');
  }
} else {
  console.log('069 balcao+caixa:', 'NAO TESTAVEL (068 faltando)');
  console.log('Proximo passo: npm run db:apply-068');
}
