import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const env = fs.readFileSync(path.join(root, '.env.local'), 'utf8');
for (const line of env.split(/\r?\n/)) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '').replace(/\r$/, '');
}

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

function perfilOk(c) {
  return Boolean(
    String(c.nome ?? '').trim() &&
      String(c.endereco ?? '').trim() &&
      String(c.telefone ?? '').trim() &&
      String(c.email ?? '').trim() &&
      String(c.data_nascimento ?? '').trim()
  );
}

const names = process.argv.slice(2).length ? process.argv.slice(2) : ['Ana Vit', 'Marcelo Queiroz'];

for (const n of names) {
  const { data, error } = await sb
    .from('colaboradores')
    .select(
      'id, nome, email, telefone, cpf, unidade_id, role, onboarding_completo, senha_hash, forca_troca_senha, endereco, data_nascimento'
    )
    .ilike('nome', `%${n}%`);

  console.log('\n---', n, error?.message ?? 'ok', 'matches:', data?.length ?? 0);
  for (const c of data ?? []) {
    console.log(
      JSON.stringify(
        {
          id: c.id,
          nome: c.nome,
          email: c.email,
          telefone: c.telefone,
          cpf: c.cpf ? 'sim' : 'nao',
          onboarding: c.onboarding_completo,
          perfil_ok: perfilOk(c),
          senha: c.senha_hash ? 'sim' : 'nao',
          forca_troca: c.forca_troca_senha,
          role: c.role,
          unidade_id: c.unidade_id,
          data_nascimento: c.data_nascimento,
          endereco: c.endereco ? `${String(c.endereco).slice(0, 30)}…` : null,
        },
        null,
        2
      )
    );
  }
}
