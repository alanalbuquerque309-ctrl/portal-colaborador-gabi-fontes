/**
 * Gate de regressão (READ-ONLY): compara um snapshot com a baseline.
 *
 * Lê scripts/_snapshots/lideranca-base.json e o snapshot mais recente
 * (ou um arquivo passado por --arquivo=...). Para cada líder, compara o
 * conjunto de `equipe_ids`. Saída lista quem ganhou/perdeu membros.
 *
 * `diff_total = 0` => pode avançar de fase. Qualquer diff => travar e investigar.
 *
 * Uso: npm run lideranca:comparar
 *      npx tsx scripts/comparar-snapshot-lideranca.ts --arquivo=scripts/_snapshots/lideranca-XXXX.json
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const dir = path.join(__dirname, '_snapshots');

type LiderSnap = { lider_id: string; nome: string | null; equipe_ids: string[] };

function ler(arquivo: string): { lideres: LiderSnap[] } {
  return JSON.parse(fs.readFileSync(arquivo, 'utf8'));
}

function snapshotMaisRecente(): string | null {
  if (!fs.existsSync(dir)) return null;
  const arquivos = fs
    .readdirSync(dir)
    .filter((f) => f.startsWith('lideranca-') && f.endsWith('.json') && f !== 'lideranca-base.json')
    .map((f) => ({ f, t: fs.statSync(path.join(dir, f)).mtimeMs }))
    .sort((a, b) => b.t - a.t);
  return arquivos[0] ? path.join(dir, arquivos[0].f) : null;
}

function main() {
  const base = path.join(dir, 'lideranca-base.json');
  if (!fs.existsSync(base)) {
    console.error('Baseline não encontrada. Rode `npm run lideranca:snapshot` antes de qualquer mudança.');
    process.exit(1);
  }

  const arg = process.argv.find((a) => a.startsWith('--arquivo='));
  const alvo = arg ? path.resolve(root, arg.split('=')[1]) : snapshotMaisRecente();
  if (!alvo || !fs.existsSync(alvo)) {
    console.error('Snapshot atual não encontrado. Rode `npm run lideranca:snapshot` para gerar.');
    process.exit(1);
  }

  const A = ler(base);
  const B = ler(alvo);
  const mapaB = new Map(B.lideres.map((l) => [l.lider_id, l]));
  const mapaA = new Map(A.lideres.map((l) => [l.lider_id, l]));

  const mudancas: Array<Record<string, unknown>> = [];

  for (const a of A.lideres) {
    const b = mapaB.get(a.lider_id);
    const setA = new Set(a.equipe_ids);
    const setB = new Set(b?.equipe_ids ?? []);
    const removidos = a.equipe_ids.filter((x) => !setB.has(x));
    const adicionados = (b?.equipe_ids ?? []).filter((x) => !setA.has(x));
    if (!b || removidos.length > 0 || adicionados.length > 0) {
      mudancas.push({
        lider_id: a.lider_id,
        nome: a.nome,
        ausente_no_atual: !b,
        perdeu: removidos,
        ganhou: adicionados,
      });
    }
  }
  for (const b of B.lideres) {
    if (!mapaA.has(b.lider_id)) {
      mudancas.push({ lider_id: b.lider_id, nome: b.nome, novo_no_atual: true, ganhou: b.equipe_ids });
    }
  }

  console.log(
    JSON.stringify(
      {
        baseline: path.relative(root, base),
        atual: path.relative(root, alvo),
        lideres_base: A.lideres.length,
        lideres_atual: B.lideres.length,
        diff_total: mudancas.length,
        gate_liberado: mudancas.length === 0,
        mudancas,
      },
      null,
      2
    )
  );
}

main();
