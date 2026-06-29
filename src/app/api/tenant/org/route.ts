import { NextResponse } from 'next/server';
import {
  listarSetoresCadastroServer,
  listarUnidadesCadastroServer,
  useTenantDbMirror,
} from '@/lib/tenant/settings-server';
import { listarUnidadesCadastro, listarSetoresCadastro } from '@/lib/tenant/org-catalog';

export const dynamic = 'force-dynamic';

/** Catálogo org resolvido (unidades Supabase + setores). Somente leitura. */
export async function GET() {
  try {
    const [unidades, setores] = await Promise.all([
      listarUnidadesCadastroServer(),
      listarSetoresCadastroServer(),
    ]);

    const fallbackUnidades = listarUnidadesCadastro();
    const unidades_fonte =
      unidades.length === fallbackUnidades.length &&
      unidades.every((u, i) => u.slug === fallbackUnidades[i]?.slug)
        ? 'constante'
        : 'supabase';

    const fallbackSetores = listarSetoresCadastro();
    const setores_fonte =
      useTenantDbMirror() && setores.join('|') !== fallbackSetores.join('|') ? 'tenant_db' : 'constante';

    return NextResponse.json(
      {
        ok: true,
        unidades,
        setores,
        unidades_fonte,
        setores_fonte,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
