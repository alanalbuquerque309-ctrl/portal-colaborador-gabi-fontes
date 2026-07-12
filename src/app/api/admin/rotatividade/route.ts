import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAdminViewerContext } from '@/lib/admin-auth';
import { podeVerAvisoAdmissaoPendente, podeVerRotatividade } from '@/lib/admin-access';
import { AUDIT_ACOES } from '@/lib/audit-log';
import { normalizarSlugUnidadeOperacional, rotuloUnidadeOperacional } from '@/lib/constants/colaborador-org';
import { normalizePortalRole } from '@/lib/roles';
import {
  agregarEntradasSaidas,
  diasEntreIso,
  formatarTempoCasa,
  isoEmIntervalo,
  limitesMesCivil,
  mesCivilAtual,
  rotuloMotivoSaida,
} from '@/lib/rotatividade';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' } as const;

type ColabRow = {
  id: string;
  nome: string;
  setor: string | null;
  role: string | null;
  data_admissao: string | null;
  unidade_id: string | null;
  unidades?: { slug?: string; nome?: string } | { slug?: string; nome?: string }[] | null;
};

type AuditRow = {
  id: string;
  criado_em: string;
  alvo_id: string | null;
  unidade_id: string | null;
  detalhes: Record<string, unknown> | null;
};

function unidadeDe(row: ColabRow): { slug: string | null; nome: string | null } {
  const raw = row.unidades;
  const u = Array.isArray(raw) ? raw[0] : raw;
  const slugRaw = u?.slug ? String(u.slug) : null;
  const slug = normalizarSlugUnidadeOperacional(slugRaw);
  return {
    slug,
    nome: rotuloUnidadeOperacional(slug) ?? (u?.nome ? String(u.nome) : null),
  };
}

/**
 * Rotatividade do mês — exclusivo Admin, RH e sócios (`podeVerRotatividade`).
 * Contratações (data_admissao) + demissões (audit excluir com snapshot/motivo).
 */
export async function GET(req: Request) {
  const ctx = await getAdminViewerContext();
  const senha = ctx?.kind === 'password_session';
  const role = ctx?.kind === 'portal' ? ctx.role : null;
  if (!ctx || !podeVerRotatividade(role, senha)) {
    return NextResponse.json({ ok: false, erro: 'Acesso restrito (Admin, RH ou sócio).' }, { status: 403, headers: NO_STORE });
  }

  const url = new URL(req.url);
  const agora = mesCivilAtual();
  const ano = Number(url.searchParams.get('ano') ?? agora.ano) || agora.ano;
  const mes = Number(url.searchParams.get('mes') ?? agora.mes) || agora.mes;
  const { inicio, fim, rotulo } = limitesMesCivil(ano, mes);
  const verAviso = podeVerAvisoAdmissaoPendente(role, senha);

  try {
    const supabase = createAdminClient();

    const { data: colabs, error: errColab } = await supabase
      .from('colaboradores')
      .select('id, nome, setor, role, data_admissao, unidade_id, unidades(slug, nome)')
      .order('nome');

    if (errColab) {
      return NextResponse.json({ ok: false, erro: errColab.message }, { status: 500, headers: NO_STORE });
    }

    const lista = (colabs ?? []) as ColabRow[];

    const contratacoes = lista
      .filter((c) => isoEmIntervalo(c.data_admissao, inicio, fim))
      .map((c) => {
        const u = unidadeDe(c);
        return {
          id: c.id,
          nome: c.nome,
          setor: c.setor,
          data_admissao: String(c.data_admissao).slice(0, 10),
          unidade_slug: u.slug,
          unidade_nome: u.nome,
        };
      })
      .sort((a, b) => a.data_admissao.localeCompare(b.data_admissao) || a.nome.localeCompare(b.nome, 'pt-BR'));

    const semAdmissao = lista
      .filter((c) => {
        const r = normalizePortalRole(c.role);
        if (r === 'socio') return false;
        const adm = String(c.data_admissao ?? '').trim();
        return !adm;
      })
      .map((c) => {
        const u = unidadeDe(c);
        return {
          id: c.id,
          nome: c.nome,
          setor: c.setor,
          unidade_slug: u.slug,
          unidade_nome: u.nome,
          role: normalizePortalRole(c.role),
        };
      });

    const inicioTs = `${inicio}T00:00:00.000Z`;
    const fimTs = `${fim}T23:59:59.999Z`;

    type DemissaoItem = {
      id: string;
      criado_em: string;
      data_saida: string;
      alvo_id: string | null;
      nome: string | null;
      setor: string | null;
      unidade_slug: string | null;
      unidade_nome: string | null;
      data_admissao: string | null;
      motivo: string | null;
      motivo_outro: string | null;
      motivo_rotulo: string;
      tempo_casa_dias: number | null;
      tempo_casa_rotulo: string;
    };

    let demissoes: DemissaoItem[] = [];

    const { data: auditRows, error: errAudit } = await supabase
      .from('audit_log')
      .select('id, criado_em, alvo_id, unidade_id, detalhes')
      .eq('acao', AUDIT_ACOES.COLAB_EXCLUIR)
      .gte('criado_em', inicioTs)
      .lte('criado_em', fimTs)
      .order('criado_em', { ascending: false });

    if (errAudit) {
      const msg = String(errAudit.message ?? '').toLowerCase();
      if (!(msg.includes('does not exist') || msg.includes('schema cache'))) {
        return NextResponse.json({ ok: false, erro: errAudit.message }, { status: 500, headers: NO_STORE });
      }
    } else {
      const rows = (auditRows ?? []) as AuditRow[];
      const unidadeIds = Array.from(
        new Set(rows.map((r) => r.unidade_id).filter((id): id is string => Boolean(id)))
      );
      let unidadePorId: Record<string, { nome: string; slug: string | null }> = {};
      if (unidadeIds.length > 0) {
        const { data: uns } = await supabase.from('unidades').select('id, nome, slug').in('id', unidadeIds);
        unidadePorId = Object.fromEntries(
          (uns ?? []).map((u) => {
            const slug = normalizarSlugUnidadeOperacional(String(u.slug ?? ''));
            return [
              u.id as string,
              { nome: rotuloUnidadeOperacional(slug) ?? String(u.nome ?? ''), slug },
            ];
          })
        );
      }

      demissoes = rows.map((r) => {
        const d = r.detalhes ?? {};
        const nomeSnap = typeof d.nome === 'string' && d.nome.trim() ? d.nome.trim() : null;
        const setorSnap = typeof d.setor === 'string' && d.setor.trim() ? d.setor.trim() : null;
        const slugSnap = normalizarSlugUnidadeOperacional(
          typeof d.unidade_slug === 'string' ? d.unidade_slug : null
        );
        const admSnap =
          typeof d.data_admissao === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d.data_admissao.slice(0, 10))
            ? d.data_admissao.slice(0, 10)
            : null;
        const motivo = typeof d.motivo === 'string' ? d.motivo : null;
        const motivoOutro = typeof d.motivo_outro === 'string' ? d.motivo_outro : null;
        const dataSaida = String(r.criado_em).slice(0, 10);
        const dias = diasEntreIso(admSnap, dataSaida);
        const uFallback = r.unidade_id ? unidadePorId[r.unidade_id] : null;
        const unidadeSlug = slugSnap ?? uFallback?.slug ?? null;
        const unidadeNome =
          rotuloUnidadeOperacional(unidadeSlug) ?? uFallback?.nome ?? null;

        return {
          id: r.id,
          criado_em: r.criado_em,
          data_saida: dataSaida,
          alvo_id: r.alvo_id,
          nome: nomeSnap,
          setor: setorSnap,
          unidade_slug: unidadeSlug,
          unidade_nome: unidadeNome,
          data_admissao: admSnap,
          motivo,
          motivo_outro: motivoOutro,
          motivo_rotulo: rotuloMotivoSaida(motivo, motivoOutro),
          tempo_casa_dias: dias,
          tempo_casa_rotulo: formatarTempoCasa(dias),
        };
      });
    }

    const porUnidade = agregarEntradasSaidas(
      contratacoes.map((c) => ({
        chave: c.unidade_slug || 'sem-unidade',
        label: c.unidade_nome || 'Sem unidade',
      })),
      demissoes.map((d) => ({
        chave: d.unidade_slug || 'sem-unidade',
        label: d.unidade_nome || 'Sem unidade',
      }))
    );

    const porSetor = agregarEntradasSaidas(
      contratacoes.map((c) => ({
        chave: (c.setor || '').trim() || 'sem-setor',
        label: (c.setor || '').trim() || 'Sem setor',
      })),
      demissoes.map((d) => ({
        chave: (d.setor || '').trim() || 'sem-setor',
        label: (d.setor || '').trim() || 'Sem setor',
      }))
    );

    const motivosMap = new Map<string, { motivo: string; rotulo: string; total: number }>();
    for (const d of demissoes) {
      const key = d.motivo || 'legado';
      const rotulo = d.motivo ? d.motivo_rotulo : 'Sem motivo (legado)';
      const cur = motivosMap.get(key) ?? { motivo: key, rotulo, total: 0 };
      cur.total += 1;
      motivosMap.set(key, cur);
    }
    const porMotivo = Array.from(motivosMap.values()).sort((a, b) => b.total - a.total);

    const comTempo = demissoes.filter((d) => d.tempo_casa_dias != null) as Array<{
      tempo_casa_dias: number;
    }>;
    const tempoMedioDias =
      comTempo.length > 0
        ? Math.round(comTempo.reduce((s, d) => s + d.tempo_casa_dias, 0) / comTempo.length)
        : null;

    const maisSaidasUnidade = [...porUnidade].sort((a, b) => b.saidas - a.saidas)[0] ?? null;
    const maisEntradasUnidade = [...porUnidade].sort((a, b) => b.entradas - a.entradas)[0] ?? null;
    const maisSaidasSetor = [...porSetor].sort((a, b) => b.saidas - a.saidas)[0] ?? null;

    return NextResponse.json(
      {
        ok: true,
        periodo: { ano, mes, inicio, fim, rotulo },
        contratacoes: {
          total: contratacoes.length,
          itens: contratacoes,
        },
        demissoes: {
          total: demissoes.length,
          itens: demissoes,
          tempo_medio_casa_dias: tempoMedioDias,
          tempo_medio_casa_rotulo: formatarTempoCasa(tempoMedioDias),
        },
        agregados: {
          por_unidade: porUnidade,
          por_setor: porSetor,
          por_motivo: porMotivo,
          destaque: {
            mais_saidas_unidade: maisSaidasUnidade
              ? { label: maisSaidasUnidade.label, saidas: maisSaidasUnidade.saidas }
              : null,
            mais_entradas_unidade: maisEntradasUnidade
              ? { label: maisEntradasUnidade.label, entradas: maisEntradasUnidade.entradas }
              : null,
            mais_saidas_setor: maisSaidasSetor
              ? { label: maisSaidasSetor.label, saidas: maisSaidasSetor.saidas }
              : null,
          },
        },
        sem_admissao: verAviso
          ? {
              total: semAdmissao.length,
              itens: semAdmissao,
            }
          : {
              total: 0,
              itens: [],
              oculto: true,
            },
        pode_ver_aviso_admissao: verAviso,
      },
      { headers: NO_STORE }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500, headers: NO_STORE });
  }
}
