import { readFileSync } from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';
import { isAdminAuthorized } from '@/lib/admin-auth';

/** Devolve o SQL da migration 032 para colar no Supabase SQL Editor (só admin). */
export async function GET() {
  if (!(await isAdminAuthorized())) {
    return NextResponse.json({ ok: false, erro: 'Não autorizado' }, { status: 401 });
  }

  try {
    const filePath = path.join(process.cwd(), 'supabase', 'migrations', '032_lideres_por_setor.sql');
    const sql = readFileSync(filePath, 'utf8');
    return NextResponse.json({ ok: true, sql, arquivo: '032_lideres_por_setor.sql' });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro ao ler migration';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
