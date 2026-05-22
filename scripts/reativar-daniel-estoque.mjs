/**
 * Reativa Daniel como líder de Estoque em todas as unidades (corrige legado que desativava).
 * Uso: node scripts/reativar-daniel-estoque.mjs
 */
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
const SETORES_DANIEL = ['CD', 'Estoque', 'Motorista', 'Administração', 'RH'];

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

function loadEnv() {
  for (const f of ['.env.local', '.env']) {
    const p = resolve(root, f);
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
    }
  }
}

loadEnv();

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

function norm(s) {
  return String(s ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

async function main() {
  const { data: daniel } = await sb
    .from('colaboradores')
    .select('id, nome')
    .or('nome.ilike.%Daniel Brito%,nome.ilike.%Daniel Martins%')
    .in('role', ['admin', 'socio', 'gerente', 'master']);
  const d = (daniel ?? []).find((c) => norm(c.nome).includes('daniel'));
  if (!d) throw new Error('Daniel não encontrado');

  const { data: unidades } = await sb.from('unidades').select('id, slug');
  let upserts = 0;
  for (const u of unidades ?? []) {
    for (const setor of SETORES_DANIEL) {
      const { error } = await sb.from('lideres_por_setor').upsert(
        {
          unidade_id: u.id,
          setor,
          lider_id: d.id,
          ativo: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'unidade_id,setor,lider_id' }
      );
      if (error) throw error;
      upserts += 1;
    }
  }
  console.log(`OK: ${upserts} vínculos Daniel (${d.nome}) reativados/atualizados.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
