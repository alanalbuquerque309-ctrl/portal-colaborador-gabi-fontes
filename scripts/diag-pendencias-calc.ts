import fs from 'fs';
import { createAdminClient } from '../src/lib/supabase/admin';
import { calcularPendenciasSemana } from '../src/lib/avaliacao-pendentes-semana';

const raw = fs.readFileSync('.env.local', 'utf8').replace(/^\uFEFF/, '');
for (const line of raw.split(/\r?\n/)) {
  const t = line.trim();
  if (!t || t.startsWith('#')) continue;
  const i = t.indexOf('=');
  if (i < 0) continue;
  let v = t.slice(i + 1).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  process.env[t.slice(0, i).trim()] = v;
}

async function main() {
  const supabase = createAdminClient();
  const p = await calcularPendenciasSemana(supabase, { filtro: 'pendentes' });
  const g = await calcularPendenciasSemana(supabase, { filtro: 'gerente' });
  const r = await calcularPendenciasSemana(supabase, { filtro: 'rh_rede' });

  const lideres = new Map<string, number>();
  for (const item of p.itens) {
    for (const resp of item.responsaveis_lider) {
      if (resp.status === 'pendente') {
        lideres.set(resp.lider_nome, (lideres.get(resp.lider_nome) ?? 0) + 1);
      }
    }
  }

  const { data: joyce } = await supabase
    .from('colaboradores')
    .select('id')
    .ilike('nome', 'Joyce Azevedo%')
    .maybeSingle();
  let joyceAvals = 0;
  if (joyce?.id) {
    const { count } = await supabase
      .from('avaliacoes_diarias')
      .select('id', { count: 'exact', head: true })
      .eq('avaliador_id', joyce.id)
      .eq('data_referencia', p.data_referencia);
    joyceAvals = count ?? 0;
  }

  console.log(
    JSON.stringify(
      {
        data_referencia: p.data_referencia,
        intervalo: p.intervalo,
        total_pendentes: p.itens.length,
        resumo: p.resumo,
        por_lider_ui: [...lideres.entries()].sort((a, b) => b[1] - a[1]),
        joyce_avaliacoes_na_semana: joyceAvals,
        amostra_joyce_pendente: p.itens
          .filter((i) => i.responsaveis_lider.some((r) => r.lider_nome.includes('Joyce') && r.status === 'pendente'))
          .slice(0, 3)
          .map((i) => ({ nome: i.colaborador_nome, tipo: i.tipo, label: i.responsavel_lider_label })),
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
