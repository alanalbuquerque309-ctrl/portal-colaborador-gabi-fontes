/**
 * Publica os treinamentos de texto da pasta conteudo/treinamentos/ no Supabase.
 * Uso: npm run treinamento:publicar-quinta
 * Opções: --dry-run (só mostra o que faria)
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const portalRoot = path.join(__dirname, '..');
const conteudoDir = path.join(portalRoot, 'conteudo', 'treinamentos');

const ARQUIVOS = [
  '05-equipe-isso-tambem-e-comigo.md',
  '06-lideranca-quando-voce-assume.md',
];

const SLUG_UNIDADE = {
  todos: 'matriz',
  lideranca: 'administrativo',
};

function stripBom(s) {
  if (s.charCodeAt(0) === 0xfeff) return s.slice(1);
  return s;
}

function readEnv(dir) {
  const out = {};
  for (const name of ['.env.local', '.env']) {
    const p = path.join(dir, name);
    if (!fs.existsSync(p)) continue;
    let raw = stripBom(fs.readFileSync(p, 'utf8'));
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

function parseFrontmatter(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!m) throw new Error('Frontmatter YAML ausente');
  const meta = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^\s*([a-z_]+)\s*:\s*(.+)\s*$/i);
    if (!kv) continue;
    let v = kv[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    meta[kv[1]] = v;
  }
  return { meta, body: m[2].trim() };
}

/** Quinta 00:00 SP do ciclo vigente → UTC ISO (igual semana-brasil.ts). */
function inicioCicloTreinoQuintaUtcIsoSp(ref = new Date()) {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  });
  const parts = fmt.formatToParts(ref);
  const y = parseInt(parts.find((p) => p.type === 'year')?.value ?? '0', 10);
  const mo = parseInt(parts.find((p) => p.type === 'month')?.value ?? '1', 10);
  const day = parseInt(parts.find((p) => p.type === 'day')?.value ?? '1', 10);
  const local = new Date(y, mo - 1, day);
  const dow = local.getDay();
  let daysBack = 0;
  if (dow >= 4) daysBack = dow - 4;
  else if (dow === 0) daysBack = 3;
  else daysBack = dow + 3;
  local.setDate(local.getDate() - daysBack);
  const ys = local.getFullYear();
  const ms = String(local.getMonth() + 1).padStart(2, '0');
  const ds = String(local.getDate()).padStart(2, '0');
  return `${ys}-${ms}-${ds}T03:00:00.000Z`;
}

const dryRun = process.argv.includes('--dry-run');
const env = readEnv(portalRoot);
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY em .env.local');
  process.exit(1);
}

const supabase = createClient(url, key);
const cicloUtc = inicioCicloTreinoQuintaUtcIsoSp();

console.log(`[treinamento:publicar-quinta] Ciclo vigente desde ${cicloUtc}${dryRun ? ' (dry-run)' : ''}`);

let publicados = 0;
let ignorados = 0;

for (const arquivo of ARQUIVOS) {
  const filePath = path.join(conteudoDir, arquivo);
  if (!fs.existsSync(filePath)) {
    console.error(`Arquivo não encontrado: ${filePath}`);
    process.exit(1);
  }

  const { meta, body } = parseFrontmatter(stripBom(fs.readFileSync(filePath, 'utf8')));
  const titulo = meta.titulo?.trim();
  const publico = meta.publico_alvo?.trim();
  const descricao = meta.descricao?.trim() || null;

  if (!titulo || !publico) {
    console.error(`Metadados inválidos em ${arquivo}`);
    process.exit(1);
  }

  const slug = SLUG_UNIDADE[publico];
  if (!slug) {
    console.error(`Público desconhecido em ${arquivo}: ${publico}`);
    process.exit(1);
  }

  const { data: unidade, error: errUnidade } = await supabase
    .from('unidades')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();

  if (errUnidade || !unidade?.id) {
    console.error(`Unidade ${slug} não encontrada:`, errUnidade?.message ?? '—');
    process.exit(1);
  }

  const { data: existentes } = await supabase
    .from('treinamentos')
    .select('id, titulo, created_at')
    .eq('publico_alvo', publico)
    .eq('ativo', true)
    .eq('tipo_conteudo', 'texto')
    .gte('created_at', cicloUtc)
    .order('created_at', { ascending: false });

  const jaTem = (existentes ?? []).some((r) => String(r.titulo).trim() === titulo);
  if (jaTem) {
    console.log(`• Já publicado neste ciclo: [${publico}] ${titulo}`);
    ignorados += 1;
    continue;
  }

  const payload = {
    titulo,
    descricao,
    tipo_conteudo: 'texto',
    conteudo_texto: body,
    publico_alvo: publico,
    unidade_id: unidade.id,
    exige_confirmacao: meta.exige_confirmacao === 'true' || meta.exige_confirmacao === true,
    ordem: Number(meta.ordem) || 0,
    ativo: true,
    video_youtube_url: null,
  };

  if (dryRun) {
    console.log(`• Publicaria: [${publico}] ${titulo} (${body.length} chars)`);
    publicados += 1;
    continue;
  }

  const { data, error } = await supabase.from('treinamentos').insert(payload).select('id, titulo').single();

  if (error) {
    console.error(`Erro ao publicar ${arquivo}:`, error.message);
    process.exit(1);
  }

  console.log(`✓ Publicado: [${publico}] ${data.titulo} (id ${data.id})`);
  publicados += 1;
}

console.log(`\nResumo: ${publicados} publicado(s), ${ignorados} já existente(s).`);
if (!dryRun && publicados > 0) {
  console.log('Portal: /portal/treinamento');
}
