import { NextRequest, NextResponse } from 'next/server';
import { readFile, stat } from 'fs/promises';
import path from 'path';

/** Ficheiros em `/manuais/*` vivem em `manuals/` na raiz do projeto (fora de `public/`) para não entrarem no precache do PWA. */
const MANUALS_DIR = path.join(process.cwd(), 'manuals');

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

function isInsideManualsDir(filePath: string): boolean {
  const root = path.resolve(MANUALS_DIR);
  const resolved = path.resolve(filePath);
  return resolved === root || resolved.startsWith(root + path.sep);
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { path?: string[] } }
) {
  const parts = params.path ?? [];
  if (parts.length === 0) {
    return new NextResponse('Not Found', { status: 404 });
  }
  if (parts.some((p) => p.includes('..'))) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  const filePath = path.join(MANUALS_DIR, ...parts);
  if (!isInsideManualsDir(filePath)) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  try {
    const st = await stat(filePath);
    if (!st.isFile()) return new NextResponse('Not Found', { status: 404 });
    const buf = await readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
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
