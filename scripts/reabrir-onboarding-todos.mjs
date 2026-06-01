/**
 * Reabre o fluxo de primeiro acesso (vídeo + manuais) para colaboradores já ativos.
 * Mantém senha, CPF e dados de perfil.
 *
 * Uso: node scripts/reabrir-onboarding-todos.mjs --confirmar
 *      node scripts/reabrir-onboarding-todos.mjs --confirmar --login "21999999999"
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const portalRoot = path.join(__dirname, '..');

function loadEnvFile(dir) {
  const out = {};
  for (const name of ['.env.local', '.env']) {
    const p = path.join(dir, name);
    if (!fs.existsSync(p)) continue;
    let raw = fs.readFileSync(p, 'utf8');
    if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);
    for (const line of raw.split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const m = t.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+)$/);
      if (!m) continue;
      let v = m[2].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      out[m[1]] = v;
    }
  }
  return out;
}

const confirmar = process.argv.includes('--confirmar');
const loginArgIdx = process.argv.indexOf('--login');
const loginFiltro = loginArgIdx >= 0 ? String(process.argv[loginArgIdx + 1] ?? '').trim() : '';

if (!confirmar) {
  console.error('Operação em massa. Rode com: node scripts/reabrir-onboarding-todos.mjs --confirmar');
  console.error('Opcional: --login "celular ou email" para um colaborador só.');
  process.exit(1);
}

const env = { ...loadEnvFile(portalRoot), ...process.env };
const url = String(env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim();
const key = String(env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim();
if (!url || !key) {
  console.error('Faltam NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY em .env.local');
  process.exit(1);
}

const supabase = createClient(url, key);

const payload = {
  onboarding_completo: false,
  onboarding_video_visto: false,
  onboarding_quiz_video_ok: false,
  onboarding_manual_geral_lido_ok: false,
  onboarding_quiz_manual_geral_ok: false,
  onboarding_manual_escolhido_concluido: false,
  onboarding_manual_escolhido_file: null,
  updated_at: new Date().toISOString(),
};

async function main() {
  if (loginFiltro) {
    const digits = loginFiltro.replace(/\D/g, '');
    let q = supabase.from('colaboradores').select('id, nome, senha_hash, email, telefone');
    if (loginFiltro.includes('@')) {
      q = q.ilike('email', loginFiltro);
    } else if (digits.length >= 10) {
      q = q.or(`telefone.eq.${digits},telefone_login.eq.${digits}`);
    } else {
      q = q.ilike('nome', `%${loginFiltro}%`);
    }
    const { data: rows, error } = await q.limit(5);
    if (error) throw new Error(error.message);
    if (!rows?.length) {
      console.error('Nenhum colaborador encontrado para o filtro informado.');
      process.exit(1);
    }
    if (rows.length > 1) {
      console.error('Mais de um colaborador encontrado; refine --login.');
      for (const r of rows) console.error(`  - ${r.nome} (${r.email ?? r.telefone})`);
      process.exit(1);
    }
    const alvo = rows[0];
    const { error: errUp } = await supabase.from('colaboradores').update(payload).eq('id', alvo.id);
    if (errUp) throw new Error(errUp.message);
    console.log(`Onboarding reaberto para: ${alvo.nome}`);
    console.log('Próximo login: vídeo → quiz → manual da cultura → restante do fluxo (senha permanece a mesma).');
    return;
  }

  const { count: antes, error: errCount } = await supabase
    .from('colaboradores')
    .select('id', { count: 'exact', head: true })
    .eq('onboarding_completo', true)
    .not('senha_hash', 'is', null);

  if (errCount) throw new Error(errCount.message);

  const { data: atualizados, error: errUp } = await supabase
    .from('colaboradores')
    .update(payload)
    .eq('onboarding_completo', true)
    .not('senha_hash', 'is', null)
    .select('id');

  if (errUp) throw new Error(errUp.message);

  console.log(`Onboarding reaberto para ${atualizados?.length ?? 0} colaborador(es) com senha já definida.`);
  console.log(`(Havia ${antes ?? 0} com onboarding_completo=true e senha.)`);
  console.log('Senha, CPF e perfil não foram alterados.');
  console.log('Todos passam pelo mesmo caminho: login → vídeo → quizzes → manuais → termo.');
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
