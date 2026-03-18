import { NextResponse } from 'next/server';
import postgres from 'postgres';

const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS unidades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT now()
  )`,
  `INSERT INTO unidades (nome, slug) VALUES
    ('Matriz (todas as lojas)', 'matriz'),
    ('Mesquita', 'mesquita'),
    ('Barra', 'barra'),
    ('Nova Iguaçu', 'nova-iguacu')
  ON CONFLICT (slug) DO NOTHING`,
  `CREATE TABLE IF NOT EXISTS colaboradores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cpf TEXT NOT NULL UNIQUE,
    nome TEXT NOT NULL,
    email TEXT,
    unidade_id UUID NOT NULL REFERENCES unidades(id),
    data_nascimento DATE,
    onboarding_completo BOOLEAN DEFAULT FALSE,
    termo_aceite_em TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
  )`,
  `ALTER TABLE colaboradores ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'colaborador'`,
  `ALTER TABLE colaboradores ENABLE ROW LEVEL SECURITY`,
];

/**
 * Bootstrap do banco: cria tabelas unidades e colaboradores.
 * Chamar: POST /api/admin/bootstrap-db com header x-bootstrap-secret
 */
export async function POST(req: Request) {
  const secret = req.headers.get('x-bootstrap-secret')?.trim();
  const expected = process.env.BOOTSTRAP_SECRET?.trim();
  if (!expected || secret !== expected) {
    return NextResponse.json({ ok: false, erro: 'Não autorizado' }, { status: 403 });
  }

  const dbUrl = process.env.DATABASE_URL?.trim();
  if (!dbUrl) {
    return NextResponse.json(
      { ok: false, erro: 'DATABASE_URL não configurada. Supabase: Settings → Database → Connection string (URI)' },
      { status: 500 }
    );
  }

  try {
    const sql = postgres(dbUrl.trim(), { max: 1, ssl: 'require' });
    for (const stmt of STATEMENTS) {
      await sql.unsafe(stmt);
    }
    await sql.end();
    return NextResponse.json({ ok: true, msg: 'Bootstrap concluído. Faça login.' });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
