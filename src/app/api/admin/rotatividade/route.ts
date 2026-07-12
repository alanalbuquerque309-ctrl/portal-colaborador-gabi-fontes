import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAdminViewerContext } from '@/lib/admin-auth';
import { podeVerAvisoAdmissaoPendente, podeVerRotatividade } from '@/lib/admin-access';
import { AUDIT_ACOES } from '@/lib/audit-log';
import { normalizarSlugUnidadeOperacional, rotuloUnidadeOperacional } from '@/lib/constants/colaborador-org';
import { normalizePortalRole } from '@/lib/roles';
import { isoEmIntervalo, limitesMesCivil, mesCivilAtual } from '@/lib/rotatividade';

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
 * Rotatividade do mês: contratações (data_admissao) + demissões (audit excluir).
 * Também lista quem ainda não tem data de admissão (para aviso Admin/RH).
 */
export async function GET(req: Request) {
  const ctx = await getAdminViewerContext();
  const senha = ctx?.kind === 'password_session';
  const role = ctx?.kind === 'portal' ? ctx.role : null;
  if (!ctx || !podeVerRotatividade(role, senha)) {
    return NextResponse.json({ ok: false, erro: 'Acesso restrito' }, { status: 403, headers: NO_STORE });
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

    let demissoes: {
      id: string;
      criado_em: string;
      alvo_id: string | null;
      unidade_id: string | null;
      unidade_nome: string | null;
    }[] = [];

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
      let nomeUnidade: Record<string, string> = {};
      if (unidadeIds.length > 0) {
        const { data: uns } = await supabase.from('unidades').select('id, nome, slug').in('id', unidadeIds);
        nomeUnidade = Object.fromEntries(
          (uns ?? []).map((u) => {
            const slug = normalizarSlugUnidadeOperacional(String(u.slug ?? ''));
            return [u.id as string, rotuloUnidadeOperacional(slug) ?? String(u.nome ?? '')];
          })
        );
      }
      demissoes = rows.map((r) => ({
        id: r.id,
        criado_em: r.criado_em,
        alvo_id: r.alvo_id,
        unidade_id: r.unidade_id,
        unidade_nome: r.unidade_id ? nomeUnidade[r.unidade_id] ?? null : null,
      }));
    }

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
