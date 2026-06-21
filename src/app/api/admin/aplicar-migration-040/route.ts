import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import postgres from 'postgres';
import { podeVerDetalheNotasAvaliacaoAdmin } from '@/lib/admin-access';
import { getAdminViewerContext } from '@/lib/admin-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { AUDIT_ACOES, registrarAuditoria } from '@/lib/audit-log';

/** Aplica migration 040 (avaliação ignorada). Requer DATABASE_URL no ambiente. */
export async function POST(req: Request) {
  const ctx = await getAdminViewerContext();
  if (!ctx) {
    return NextResponse.json({ ok: false, erro: 'Acesso restrito' }, { status: 403 });
  }
  const senha = ctx.kind === 'password_session';
  const role = ctx.kind === 'portal' ? ctx.role : null;
  if (!podeVerDetalheNotasAvaliacaoAdmin(role, senha)) {
    return NextResponse.json({ ok: false, erro: 'Acesso restrito' }, { status: 403 });
  }

  const dbUrl = process.env.DATABASE_URL?.trim();
  if (!dbUrl) {
    return NextResponse.json(
      {
        ok: false,
        erro: 'DATABASE_URL não configurada. Cole supabase/APLIQUE_040_SQL_EDITOR.sql no SQL Editor do Supabase.',
      },
      { status: 500 }
    );
  }

  const sqlPath = join(process.cwd(), 'supabase', 'migrations', '040_avaliacao_ignorada.sql');
  let ddl: string;
  try {
    ddl = readFileSync(sqlPath, 'utf8').replace(/^\uFEFF/, '').trim();
  } catch {
    return NextResponse.json({ ok: false, erro: 'Ficheiro 040_avaliacao_ignorada.sql não encontrado.' }, { status: 500 });
  }

  try {
    const sql = postgres(dbUrl, { max: 1, ssl: 'require' });
    await sql.unsafe(ddl);
    await sql.end();
    try {
      await registrarAuditoria(createAdminClient(), {
        acao: AUDIT_ACOES.MIGRATION_APLICAR,
        detalhes: { migration: '040' },
        req,
      });
    } catch {
      /* fail-safe */
    }
    return NextResponse.json({ ok: true, msg: 'Migration 040 aplicada (avaliação ignorada).' });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/already exists/i.test(msg)) {
      return NextResponse.json({ ok: true, msg: 'Colunas já existiam (ignorado).' });
    }
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
