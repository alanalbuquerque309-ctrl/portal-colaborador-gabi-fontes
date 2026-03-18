#!/usr/bin/env node
/**
 * Executa o bootstrap do banco de dados.
 * Uso: BOOTSTRAP_SECRET=xxx node scripts/executar-bootstrap.js
 * Ou: set BOOTSTRAP_SECRET=xxx && node scripts/executar-bootstrap.js (Windows)
 * 
 * Requer no Vercel (Settings → Environment Variables):
 * - DATABASE_URL (Supabase → Settings → Database → Connection string URI)
 * - BOOTSTRAP_SECRET (qualquer string secreta)
 */

const SECRET = process.env.BOOTSTRAP_SECRET;
const BASE = process.env.VERCEL_URL 
  ? `https://${process.env.VERCEL_URL}` 
  : (process.env.BASE_URL || 'https://portal-colaborador-gabi-fontes.vercel.app');

async function run() {
  if (!SECRET) {
    console.error('Defina BOOTSTRAP_SECRET. Exemplo:');
    console.error('  set BOOTSTRAP_SECRET=minha-senha-secreta-123');
    console.error('  node scripts/executar-bootstrap.js');
    process.exit(1);
  }

  console.log('Chamando bootstrap em', BASE + '/api/admin/bootstrap-db');
  const res = await fetch(BASE + '/api/admin/bootstrap-db', {
    method: 'POST',
    headers: { 'x-bootstrap-secret': SECRET },
  });
  const data = await res.json();

  if (data.ok) {
    console.log('✓', data.msg);
  } else {
    console.error('✗ Erro:', data.erro || res.statusText);
    process.exit(1);
  }
}

run();
