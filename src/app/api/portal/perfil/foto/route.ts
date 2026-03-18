import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';

const BUCKET = 'fotos-perfil';
const MAX_SIZE = 2 * 1024 * 1024; // 2 MB
const TIPOS_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp'];

/** Upload de foto de perfil. Requer sessão do portal. */
export async function POST(req: Request) {
  const cookieStore = await cookies();
  const colaboradorId = cookieStore.get('portal_colaborador_id')?.value;
  if (!colaboradorId || colaboradorId === 'pending') {
    return NextResponse.json({ ok: false, erro: 'Faça login no portal' }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ ok: false, erro: 'Requisição inválida' }, { status: 400 });
  }

  const file = formData.get('foto');
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, erro: 'Envie uma imagem' }, { status: 400 });
  }

  if (!TIPOS_PERMITIDOS.includes(file.type)) {
    return NextResponse.json(
      { ok: false, erro: 'Use JPG, PNG ou WebP' },
      { status: 400 }
    );
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { ok: false, erro: 'Imagem deve ter no máximo 2 MB' },
      { status: 400 }
    );
  }

  const ext = file.type === 'image/webp' ? 'webp' : file.type === 'image/png' ? 'png' : 'jpg';
  const path = `${colaboradorId}.${ext}`;

  try {
    const supabase = createAdminClient();
    const { data: bucketList } = await supabase.storage.listBuckets();
    const bucketExists = bucketList?.some((b) => b.name === BUCKET);

    if (!bucketExists) {
      const { error: createErr } = await supabase.storage.createBucket(BUCKET, { public: true });
      if (createErr) {
        return NextResponse.json(
          { ok: false, erro: `Crie o bucket "${BUCKET}" no Supabase: Storage → New bucket → ${BUCKET} (public)` },
          { status: 500 }
        );
      }
    }

    const arrayBuffer = await file.arrayBuffer();
    const { error: uploadErr } = await supabase.storage
      .from(BUCKET)
      .upload(path, arrayBuffer, { upsert: true, contentType: file.type });

    if (uploadErr) {
      return NextResponse.json({ ok: false, erro: uploadErr.message }, { status: 500 });
    }

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
    const fotoUrl = urlData.publicUrl;

    const { error: updateErr } = await supabase
      .from('colaboradores')
      .update({ foto_url: fotoUrl, updated_at: new Date().toISOString() })
      .eq('id', colaboradorId);

    if (updateErr) {
      return NextResponse.json({ ok: false, erro: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, foto_url: fotoUrl });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
