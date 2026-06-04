import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdminFullApi } from '@/lib/admin-auth';
import { metaTrofeuPar } from '@/lib/trofeus-pares';
import { formatarIntervaloSemanaPtBR } from '@/lib/semana-referencia';

const NO_STORE = { 'Cache-Control': 'no-store' } as const;

function tabelaInexistente(msg: string): boolean {
  const m = msg.toLowerCase();
  return m.includes('trofeus_entre_pares') && (m.includes('does not exist') || m.includes('schema cache'));
}

/** Relatório admin: quem enviou qual troféu para quem (entre pares). */
export async function GET(req: Request) {
  const auth = await requireAdminFullApi();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const inicio = searchParams.get('inicio')?.trim();
  const fim = searchParams.get('fim')?.trim();
  const unidadeSlug = searchParams.get('unidade_slug')?.trim();
  const busca = searchParams.get('q')?.trim().toLowerCase() ?? '';
  const limite = Math.min(2000, Math.max(50, Number(searchParams.get('limite')) || 500));

  if (!inicio || !/^\d{4}-\d{2}-\d{2}$/.test(inicio) || !fim || !/^\d{4}-\d{2}-\d{2}$/.test(fim)) {
    return NextResponse.json(
      { ok: false, erro: 'Parâmetros inicio e fim obrigatórios (YYYY-MM-DD)' },
      { status: 400, headers: NO_STORE }
    );
  }

  try {
    const supabase = createAdminClient();

    let unidadeId: string | null = null;
    if (unidadeSlug) {
      const { data: u } = await supabase.from('unidades').select('id').eq('slug', unidadeSlug).maybeSingle();
      if (u?.id) unidadeId = String(u.id);
    }

    let query = supabase
      .from('trofeus_entre_pares')
      .select('id, avaliador_id, destinatario_id, unidade_id, semana_inicio, tipo, created_at')
      .gte('semana_inicio', inicio)
      .lte('semana_inicio', fim)
      .order('semana_inicio', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limite);

    if (unidadeId) query = query.eq('unidade_id', unidadeId);

    const { data: rows, error } = await query;
    if (error) {
      if (tabelaInexistente(error.message)) {
        return NextResponse.json(
          {
            ok: false,
            code: 'trofeus_missing_table',
            erro: 'Tabela de troféus não criada. Rode a migração 033 no Supabase.',
          },
          { status: 503, headers: NO_STORE }
        );
      }
      return NextResponse.json({ ok: false, erro: error.message }, { status: 500, headers: NO_STORE });
    }

    const idsPessoas = new Set<string>();
    const idsUnidades = new Set<string>();
    for (const r of rows ?? []) {
      if (r.avaliador_id) idsPessoas.add(String(r.avaliador_id));
      if (r.destinatario_id) idsPessoas.add(String(r.destinatario_id));
      if (r.unidade_id) idsUnidades.add(String(r.unidade_id));
    }

    const nomePorId = new Map<string, string>();
    if (idsPessoas.size > 0) {
      const { data: pessoas } = await supabase
        .from('colaboradores')
        .select('id, nome')
        .in('id', Array.from(idsPessoas));
      for (const p of pessoas ?? []) nomePorId.set(String(p.id), String(p.nome ?? ''));
    }

    const unidadePorId = new Map<string, { nome: string; slug: string | null }>();
    if (idsUnidades.size > 0) {
      const { data: unidades } = await supabase
        .from('unidades')
        .select('id, nome, slug')
        .in('id', Array.from(idsUnidades));
      for (const u of unidades ?? []) {
        unidadePorId.set(String(u.id), {
          nome: String(u.nome ?? ''),
          slug: (u as { slug?: string | null }).slug ?? null,
        });
      }
    }

    let linhas = (rows ?? []).map((r) => {
      const tipo = String(r.tipo ?? '');
      const meta = metaTrofeuPar(tipo);
      const uid = String(r.unidade_id ?? '');
      const un = unidadePorId.get(uid);
      const semanaInicio = String(r.semana_inicio ?? '');
      return {
        id: String(r.id),
        semana_inicio: semanaInicio,
        semana_intervalo: semanaInicio ? formatarIntervaloSemanaPtBR(semanaInicio) : semanaInicio,
        avaliador_id: String(r.avaliador_id ?? ''),
        avaliador_nome: nomePorId.get(String(r.avaliador_id)) ?? '—',
        destinatario_id: String(r.destinatario_id ?? ''),
        destinatario_nome: nomePorId.get(String(r.destinatario_id)) ?? '—',
        tipo,
        trofeu_titulo: meta?.titulo ?? tipo,
        trofeu_emoji: meta?.emoji ?? '🏅',
        unidade_nome: un?.nome ?? '—',
        unidade_slug: un?.slug ?? null,
        created_at: String(r.created_at ?? ''),
      };
    });

    if (busca) {
      linhas = linhas.filter((l) => {
        const hay = [
          l.avaliador_nome,
          l.destinatario_nome,
          l.trofeu_titulo,
          l.unidade_nome,
          l.tipo,
        ]
          .join(' ')
          .toLowerCase();
        return hay.includes(busca);
      });
    }

    return NextResponse.json(
      { ok: true, total: linhas.length, linhas },
      { headers: NO_STORE }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500, headers: NO_STORE });
  }
}
