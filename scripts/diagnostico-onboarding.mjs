/**
 * Diagnóstico rápido: quantos colaboradores com onboarding pendente vs completo.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

function loadEnv() {
  const out = {};
  for (const name of ['.env.local', '.env']) {
    const p = path.join(root, name);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (m) out[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
    }
  }
  return { ...out, ...process.env };
}

const env = loadEnv();
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const { data: todos } = await supabase
  .from('colaboradores')
  .select('nome, role, onboarding_completo, onboarding_video_visto, senha_hash, cpf')
  .order('nome');

const comSenha = (todos ?? []).filter((c) => c.senha_hash);
const pendentes = comSenha.filter((c) => !c.onboarding_completo);
const completos = comSenha.filter((c) => c.onboarding_completo);

console.log(`Com senha: ${comSenha.length} | onboarding pendente: ${pendentes.length} | completo: ${completos.length}`);
console.log('\nPendentes:');
for (const c of pendentes.slice(0, 25)) {
  console.log(`  ${c.nome} (${c.role}) video=${c.onboarding_video_visto}`);
}
const alan = (todos ?? []).find((c) => String(c.cpf ?? '').replace(/\D/g, '') === '05376259765');
if (alan) {
  console.log('\nAlan:', {
    onboarding_completo: alan.onboarding_completo,
    onboarding_video_visto: alan.onboarding_video_visto,
    role: alan.role,
  });
}
