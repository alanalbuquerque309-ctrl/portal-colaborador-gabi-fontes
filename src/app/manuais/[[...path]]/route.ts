import { NextRequest, NextResponse } from 'next/server';
import { readFile, stat } from 'fs/promises';
import path from 'path';
import type { Stats } from 'fs';
import { isManualArquivoPermitido } from '@/lib/manual-por-setor';

/** Origem principal (repo). */
const MANUALS_DIR = path.join(process.cwd(), 'manuals');
/** Cópia gerada em `prebuild` (scripts/sync-manuals-to-public.cjs) — garante deploy na Vercel. */
const PUBLIC_MANUALS_DIR = path.join(process.cwd(), 'public', 'manuais');

const MANUAL_ROOTS = [MANUALS_DIR, PUBLIC_MANUALS_DIR] as const;

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf',
};

function isInsideRoot(rootDir: string, filePath: string): boolean {
  const root = path.resolve(rootDir);
  const resolved = path.resolve(filePath);
  return resolved === root || resolved.startsWith(root + path.sep);
}

/**
 * Tenta `manuals/` e depois `public/manuais/` (cópia do prebuild).
 */
async function resolveManualFile(
  parts: string[]
): Promise<{ filePath: string; st: Stats } | null> {
  for (const base of MANUAL_ROOTS) {
    const filePath = path.join(base, ...parts);
    if (!isInsideRoot(base, filePath)) {
      return null;
    }
    try {
      const st = await stat(filePath);
      if (st.isFile()) {
        return { filePath, st };
      }
    } catch {
      /* tentar outra raiz */
    }
  }
  return null;
}

function buildManualSecurityTag(request: NextRequest, manualPath: string): string {
  const colaboradorId = request.cookies.get('portal_colaborador_id')?.value;
  if (!colaboradorId || colaboradorId === 'pending') return '';
  const safePath = JSON.stringify(manualPath);
  return `<script>
(() => {
  const endpoint = '/api/portal/manual-eventos';
  const manualPath = ${safePath};
  const debounceMs = 8000;
  const ultimaEmissao = new Map();

  function enviar(tipo) {
    const agora = Date.now();
    const ultima = Number(ultimaEmissao.get(tipo) || 0);
    if (agora - ultima < debounceMs) return;
    ultimaEmissao.set(tipo, agora);

    const payload = JSON.stringify({ tipo, manual_path: manualPath });
    try {
      if (navigator.sendBeacon) {
        const blob = new Blob([payload], { type: 'application/json' });
        navigator.sendBeacon(endpoint, blob);
        return;
      }
    } catch {}
    try {
      fetch(endpoint, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true
      }).catch(() => {});
    } catch {}
  }

  window.addEventListener('keydown', (event) => {
    if (event.key === 'PrintScreen') {
      enviar('printscreen');
      return;
    }
    const atalhoImpressao = (event.ctrlKey || event.metaKey) && String(event.key || '').toLowerCase() === 'p';
    if (atalhoImpressao) enviar('atalho_impressao');
  }, { passive: true });

  window.addEventListener('beforeprint', () => enviar('beforeprint'));
})();
</script>`;
}

export async function GET(request: NextRequest, { params }: { params: { path?: string[] } }) {
  const parts = params.path ?? [];
  if (parts.length === 0) {
    return new NextResponse('Not Found', { status: 404 });
  }
  if (parts.some((p) => p.includes('..'))) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  const manualPath = `/manuais/${parts.join('/')}`;
  const fileName = decodeURIComponent(parts[parts.length - 1] ?? '');
  const extEarly = path.extname(fileName).toLowerCase();

  /** Navegação na barra de endereço (não iframe do portal) → leitor com menu do portal. */
  if (extEarly === '.html') {
    const fetchDest = (request.headers.get('sec-fetch-dest') ?? '').toLowerCase();
    const isEmbedded = fetchDest === 'iframe' || fetchDest === 'nested-document';
    if (!isEmbedded && isManualArquivoPermitido(fileName)) {
      const dest = new URL('/portal/manual', request.url);
      dest.searchParams.set('file', fileName);
      return NextResponse.redirect(dest, 307);
    }
  }

  const resolved = await resolveManualFile(parts);
  if (!resolved) {
    return new NextResponse('Not Found', { status: 404 });
  }

  const { filePath, st } = resolved;

  try {
    const buf = await readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.html') {
      const html = buf.toString('utf-8');
      const securityTag = buildManualSecurityTag(request, manualPath);
      const cacheBustComment = `<!-- gf-manual:${st.mtimeMs}:${st.size} -->\n`;
      const body =
        securityTag && html.includes('</body>')
          ? html.replace('</body>', `${securityTag}</body>`)
          : securityTag
            ? `${html}${securityTag}`
            : html;
      const finalHtml = cacheBustComment + body;
      const etag = `"${st.mtimeMs}-${st.size}"`;
      return new NextResponse(finalHtml, {
        status: 200,
        headers: {
          'Content-Type': MIME[ext] ?? 'application/octet-stream',
          'Cache-Control': 'private, no-store, max-age=0, must-revalidate',
          ETag: etag,
        },
      });
    }
    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': MIME[ext] ?? 'application/octet-stream',
        'Cache-Control': 'public, max-age=0, must-revalidate',
      },
    });
  } catch {
    return new NextResponse('Not Found', { status: 404 });
  }
}
