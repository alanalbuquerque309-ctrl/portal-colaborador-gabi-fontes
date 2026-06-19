/**
 * Re-sincroniza missões Grãos da semana piloto (15/06) para todos colaboradores.
 * Uso: node scripts/resync-graos-semana-piloto.mjs
 */
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { loadEnvFile } from './lib/resolve-database-url.mjs';

const SEM = '2026-06-15';
const GRAOS = { login: 5, aviso: 5, lideranca: 10, quinta: 5 };
const portalRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const env = { ...loadEnvFile(portalRoot), ...process.env };
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

function semanaInicioUtc(iso) {
  return `${iso}T03:00:00.000Z`;
}
function semanaFimExclusiveUtc(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + 7, 3, 0, 0, 0)).toISOString();
}

function refKey(cid, missao, sem, sufixo) {
  const b = `${cid}:${missao}:${sem}`;
  return sufixo ? `${b}:${sufixo}` : b;
}

async function creditar(cid, sem, missao, graos, descricao, ref, meta) {
  const { data: ex } = await sb.from('graos_movimentos').select('id, estado').eq('ref_key', ref).maybeSingle();
  if (ex) {
    if (ex.estado === 'cancelado') {
      await sb
        .from('graos_movimentos')
        .update({ estado: 'pendente', graos, descricao, meta: meta ?? {} })
        .eq('id', ex.id);
    }
    return;
  }
  await sb.from('graos_movimentos').insert({
    colaborador_id: cid,
    semana_inicio: sem,
    missao,
    graos,
    estado: 'pendente',
    ref_key: ref,
    descricao,
    meta: meta ?? {},
  });
}

async function syncColaborador(c) {
  const cid = c.id;
  await creditar(cid, SEM, 'login_semana', GRAOS.login, 'Entrada no portal na semana', refKey(cid, 'login_semana', SEM));

  const { data: confs } = await sb
    .from('aviso_confirmacoes')
    .select('aviso_id')
    .eq('colaborador_id', cid)
    .gte('confirmado_em', semanaInicioUtc(SEM))
    .lt('confirmado_em', semanaFimExclusiveUtc(SEM))
    .limit(1);
  if (confs?.length) {
    await creditar(cid, SEM, 'aviso_semana', GRAOS.aviso, 'Leitura de comunicado', refKey(cid, 'aviso_semana', SEM), {
      aviso_id: confs[0].aviso_id,
    });
  }

  const { count: lid } = await sb
    .from('avaliacoes_lideranca')
    .select('id', { count: 'exact', head: true })
    .eq('avaliador_id', cid)
    .eq('semana_inicio', SEM);
  if ((lid ?? 0) > 0) {
    await creditar(cid, SEM, 'lideranca_semana', GRAOS.lideranca, 'Avaliar liderança', refKey(cid, 'lideranca_semana', SEM));
  }

  const { count: trof } = await sb
    .from('trofeus_entre_pares')
    .select('id', { count: 'exact', head: true })
    .eq('avaliador_id', cid)
    .eq('semana_inicio', SEM);
  const gTrof = (trof ?? 0) >= 3 ? 5 : trof ?? 0;
  if (gTrof > 0) {
    await creditar(
      cid,
      SEM,
      'trofeu_semana',
      gTrof,
      `Troféus entre pares (${trof} enviado(s))`,
      refKey(cid, 'trofeu_semana', SEM)
    );
  }

  const { data: qConc } = await sb
    .from('graos_quinta_conclusoes')
    .select('data_quinta')
    .eq('colaborador_id', cid)
    .gte('data_quinta', SEM)
    .limit(5);
  for (const q of qConc ?? []) {
    const dq = String(q.data_quinta);
    await creditar(cid, SEM, 'quinta', GRAOS.quinta, 'Quinta do café', refKey(cid, 'quinta', SEM, dq));
  }
}

const { data: cols } = await sb.from('colaboradores').select('id, nome').eq('role', 'colaborador');
console.log(`Resync semana ${SEM} — ${cols?.length ?? 0} colaboradores`);
for (const c of cols ?? []) {
  await syncColaborador(c);
}
console.log('Missões sincronizadas. Rode confirmar-graos-elegibilidade-todos.mjs --confirmar');
