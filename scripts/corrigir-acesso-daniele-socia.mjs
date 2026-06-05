/**
 * Reset de primeiro acesso — Daniele Aparecida (sócia).
 * Uso: node scripts/corrigir-acesso-daniele-socia.mjs --confirmar
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

function loadEnv() {
  for (const name of ['.env.local', '.env']) {
    const p = path.join(root, name);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
      const m = line.trim().match(/^([A-Za-z_][A-Za-z0-9_]*)=(.+)$/);
      if (!m) continue;
      let v = m[2].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      process.env[m[1]] = v;
    }
  }
}

loadEnv();

const DANIELE_ID = 'f05b925d-4e56-4873-88ad-ae87a3753652';
const confirmar = process.argv.includes('--confirmar');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY obrigatórios.');
  process.exit(1);
}

const sb = createClient(url, key);

/** Como colaboradora nova: sem senha, onboarding zerado, perfil pessoal a refazer. Mantém CPF, nome, e-mail, telefone, role sócia. */
const PAYLOAD_PRIMEIRO_ACESSO = {
  senha_hash: null,
  forca_troca_senha: false,
  onboarding_completo: false,
  onboarding_video_visto: false,
  onboarding_quiz_video_ok: false,
  onboarding_manual_geral_lido_ok: false,
  onboarding_quiz_manual_geral_ok: false,
  onboarding_manual_escolhido_concluido: false,
  onboarding_manual_escolhido_file: null,
  data_nascimento: null,
  endereco: null,
  foto_url: null,
  role: 'socio',
  updated_at: new Date().toISOString(),
};

const { data: antes, error: errAntes } = await sb
  .from('colaboradores')
  .select(
    'id, nome, email, telefone, cpf, role, senha_hash, forca_troca_senha, onboarding_completo, data_nascimento, endereco'
  )
  .eq('id', DANIELE_ID)
  .single();

if (errAntes || !antes) {
  console.error('Colaboradora não encontrada:', errAntes?.message);
  process.exit(1);
}

console.log('Antes:', JSON.stringify(antes, null, 2));

if (!confirmar) {
  console.log('\nDry-run. Rode com --confirmar para zerar primeiro acesso (senha + onboarding + perfil pessoal).');
  process.exit(0);
}

const { data: depois, error: errUp } = await sb
  .from('colaboradores')
  .update(PAYLOAD_PRIMEIRO_ACESSO)
  .eq('id', DANIELE_ID)
  .select(
    'id, nome, email, telefone, cpf, role, senha_hash, forca_troca_senha, onboarding_completo, data_nascimento, endereco'
  )
  .single();

if (errUp) {
  console.error('Erro ao atualizar:', errUp.message);
  process.exit(1);
}

console.log('\nDepois:', JSON.stringify(depois, null, 2));
console.log('\nFluxo para a Daniele:');
console.log('1. Login com danielefontes2010@gmail.com ou 21967416113');
console.log('2. Criar senha de 6 números (primeiro acesso)');
console.log('3. Completar perfil (data nascimento, endereço, etc.)');
console.log('4. Vídeo + manuais + quiz (onboarding)');
