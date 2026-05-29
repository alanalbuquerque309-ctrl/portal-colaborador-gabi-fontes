import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import postgres from 'postgres';
import { getAdminViewerContext } from '@/lib/admin-auth';
import { podeVerBonificacaoInterna } from '@/lib/bonificacao-access';

function podeExecutar(ctx: Awaited<ReturnType<typeof getAdminViewerContext>>): boolean {
  if (!ctx) return false;
  if (ctx.kind === 'password_session') return true;
  return podeVerBonificacaoInterna(ctx.role);
}

/** Aplica só a migration 035 (operacao_apto). Requer DATABASE_URL no ambiente (Vercel ou local). */
export async function POST() {
  const ctx = await getAdminViewerContext();
  if (!podeExecutar(ctx)) {
    return NextResponse.json({ ok: false, erro: 'Acesso restrito' }, { status: 403 });
  }

  const dbUrl = process.env.DATABASE_URL?.trim();
  if (!dbUrl) {
    return NextResponse.json(
      {
        ok: false,
        erro: 'DATABASE_URL não configurada. Use SQL Editor no Supabase ou defina DATABASE_URL no .env.local / Vercel.',
      },
      { status: 500 }
    );
  }

  const sqlPath = join(process.cwd(), 'supabase', 'migrations', '035_operacao_apto.sql');
  let ddl: string;
  try {
    ddl = readFileSync(sqlPath, 'utf8').replace(/^\uFEFF/, '').trim();
  } catch {
    return NextResponse.json({ ok: false, erro: 'Ficheiro 035_operacao_apto.sql não encontrado.' }, { status: 500 });
  }

  try {
    const sql = postgres(dbUrl, { max: 1, ssl: 'require' });
    await sql.unsafe(ddl);
    await sql.end();
    return NextResponse.json({ ok: true, msg: 'Migration 035 aplicada (operacao_apto).' });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/already exists/i.test(msg)) {
      return NextResponse.json({ ok: true, msg: 'Colunas já existiam (ignorado).' });
    }
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
