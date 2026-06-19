/**
 * Corrige saldos da semana piloto (15/06/2026):
 * 1) trofeu_semana — atualiza grãos conforme qtd real de troféus enviados
 * 2) sugestao_destaque — mantém só o maior bônus por colaborador/semana
 *
 * Uso:
 *   node scripts/corrigir-graos-semana-piloto.mjs
 *   node scripts/corrigir-graos-semana-piloto.mjs --confirmar
 *   node scripts/corrigir-graos-semana-piloto.mjs --nome Tiago --confirmar
 */
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { loadEnvFile } from './lib/resolve-database-url.mjs';

const SEM = '2026-06-15';
const portalRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

function graosPorTrofeus(qtd) {
  if (qtd <= 0) return 0;
  if (qtd === 1) return 1;
  if (qtd === 2) return 2;
  return 5;
}

async function main() {
  const env = { ...loadEnvFile(portalRoot), ...process.env };
  const confirmar = process.argv.includes('--confirmar');
  const filtro = (() => {
    const i = process.argv.indexOf('--nome');
    return i >= 0 ? process.argv[i + 1]?.trim().toLowerCase() : '';
  })();

  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

  let qColab = sb.from('colaboradores').select('id, nome').eq('role', 'colaborador').order('nome');
  const { data: cols, error: errColab } = await qColab;
  if (errColab) throw new Error(errColab.message);

  const lista = (cols ?? []).filter((c) => !filtro || c.nome.toLowerCase().includes(filtro));

  console.log(`Correção semana ${SEM} | ${lista.length} colaborador(es)`);
  console.log(confirmar ? 'Modo: APLICAR\n' : 'Modo: dry-run (use --confirmar)\n');

  let trofeuAtualizados = 0;
  let destaqueCancelados = 0;

  for (const c of lista) {
    const cid = c.id;
    const nome = c.nome;
    const acoes = [];

    // --- Troféus ---
    const { count: trofCount } = await sb
      .from('trofeus_entre_pares')
      .select('id', { count: 'exact', head: true })
      .eq('avaliador_id', cid)
      .eq('semana_inicio', SEM);

    const graosEsperado = graosPorTrofeus(trofCount ?? 0);

    const { data: movTrof } = await sb
      .from('graos_movimentos')
      .select('id, graos, estado')
      .eq('colaborador_id', cid)
      .eq('semana_inicio', SEM)
      .eq('missao', 'trofeu_semana')
      .neq('estado', 'cancelado')
      .maybeSingle();

    if (graosEsperado === 0 && movTrof) {
      acoes.push(`trofeu: cancelar mov ${movTrof.graos} (0 troféus)`);
      if (confirmar) {
        await sb.from('graos_movimentos').update({ estado: 'cancelado' }).eq('id', movTrof.id);
      }
      trofeuAtualizados++;
    } else if (graosEsperado > 0) {
      if (!movTrof) {
        acoes.push(`trofeu: criar ${graosEsperado} (${trofCount} enviados)`);
        if (confirmar) {
          await sb.from('graos_movimentos').insert({
            colaborador_id: cid,
            semana_inicio: SEM,
            missao: 'trofeu_semana',
            graos: graosEsperado,
            estado: 'confirmado',
            ref_key: `${cid}:trofeu_semana:${SEM}`,
            descricao: `Troféus entre pares (${trofCount} enviado(s))`,
            meta: { qtd: trofCount, ajuste_sistema: 'resync_trofeu_piloto' },
          });
        }
        trofeuAtualizados++;
      } else if (Number(movTrof.graos) !== graosEsperado) {
        acoes.push(`trofeu: ${movTrof.graos} → ${graosEsperado} (${trofCount} enviados)`);
        if (confirmar) {
          await sb
            .from('graos_movimentos')
            .update({
              graos: graosEsperado,
              descricao: `Troféus entre pares (${trofCount} enviado(s))`,
              meta: { qtd: trofCount, ajuste_sistema: 'resync_trofeu_piloto' },
            })
            .eq('id', movTrof.id);
        }
        trofeuAtualizados++;
      }
    }

    // --- Bônus sugestão (máx 1 por semana) ---
    const { data: destaques } = await sb
      .from('graos_movimentos')
      .select('id, graos, estado, created_at, descricao')
      .eq('colaborador_id', cid)
      .eq('semana_inicio', SEM)
      .eq('missao', 'sugestao_destaque')
      .neq('estado', 'cancelado')
      .order('graos', { ascending: false })
      .order('created_at', { ascending: false });

    if ((destaques ?? []).length > 1) {
      const rank = (est) => (est === 'pendente' ? 2 : est === 'confirmado' ? 1 : 0);
      const sorted = [...destaques].sort((a, b) => {
        const dg = Number(b.graos) - Number(a.graos);
        if (dg !== 0) return dg;
        return rank(b.estado) - rank(a.estado);
      });
      const manter = sorted[0];
      const cancelar = sorted.slice(1);
      acoes.push(
        `destaque: manter ${manter.graos} ${manter.estado}, cancelar ${cancelar.map((x) => `${x.graos} ${x.estado}`).join(', ')}`
      );
      if (confirmar) {
        await sb
          .from('graos_movimentos')
          .update({
            estado: 'cancelado',
            meta: { ajuste_sistema: 'deduplicacao_sugestao_destaque_semana', oculto_colaborador: true },
          })
          .in(
            'id',
            cancelar.map((x) => x.id)
          );
      }
      destaqueCancelados += cancelar.length;
    }

    if (acoes.length) {
      console.log(`${nome}:`);
      for (const a of acoes) console.log(`  ${a}`);
    }
  }

  console.log('\n--- Resumo ---');
  console.log(`Troféus ajustados: ${trofeuAtualizados}`);
  console.log(`Bônus destaque cancelados: ${destaqueCancelados}`);
  if (!confirmar && (trofeuAtualizados > 0 || destaqueCancelados > 0)) {
    console.log('\nExecute com --confirmar para aplicar.');
  }
}

main().catch((e) => {
  console.error('Erro:', e instanceof Error ? e.message : e);
  process.exit(1);
});
