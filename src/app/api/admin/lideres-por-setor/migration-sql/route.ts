import { readFileSync } from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';
import { isAdminAuthorized } from '@/lib/admin-auth';

const ARQUIVOS_PERMITIDOS: Record<string, string> = {
  '032': '032_lideres_por_setor.sql',
  '042': '042_plantao_12x36_paridade.sql',
};

/** Devolve o SQL de uma migration permitida para colar no Supabase SQL Editor (só admin). */
export async function GET(req: Request) {
  if (!(await isAdminAuthorized())) {
    return NextResponse.json({ ok: false, erro: 'Não autorizado' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const chave = searchParams.get('arquivo')?.trim() || '032';
  const arquivo = ARQUIVOS_PERMITIDOS[chave] ?? ARQUIVOS_PERMITIDOS['032'];

  try {
    const filePath = path.join(process.cwd(), 'supabase', 'migrations', arquivo);
    const sql = readFileSync(filePath, 'utf8');
    return NextResponse.json({ ok: true, sql, arquivo });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro ao ler migration';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
