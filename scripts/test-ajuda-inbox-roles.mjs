/**
 * Smoke test: permissões do Inbox ajuda (opção A).
 * Uso: node scripts/test-ajuda-inbox-roles.mjs
 */
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

// Compilar roles via tsx dynamic import
const rolesPath = path.join(root, 'src/lib/roles.ts');
const { canResponderAjudaFinal, canVisualizarAjuda } = await import(
  pathToFileURL(rolesPath).href
);

const DANIEL = '11111111-1111-4111-8111-111111111111';
const OUTRO = '22222222-2222-4222-8222-222222222222';

function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exit(1);
  }
  console.log('OK:', msg);
}

// Com responsável dedicado
process.env.NEXT_PUBLIC_AJUDA_RESPONSAVEL_COLABORADOR_ID = DANIEL;
process.env.AJUDA_RESPONSAVEL_COLABORADOR_ID = '';

assert(canResponderAjudaFinal(DANIEL, 'colaborador'), 'responsável UUID responde');
assert(canResponderAjudaFinal(OUTRO, 'socio'), 'sócio responde com env dedicado');
assert(canResponderAjudaFinal(OUTRO, 'admin'), 'admin responde com env dedicado');
assert(!canResponderAjudaFinal(OUTRO, 'rh'), 'RH não responde com env dedicado');
assert(!canResponderAjudaFinal(OUTRO, 'gerente'), 'gerente não responde');
assert(canVisualizarAjuda('socio', OUTRO), 'sócio vê inbox');
assert(canVisualizarAjuda('admin', OUTRO), 'admin vê inbox');
assert(canVisualizarAjuda('rh', OUTRO) === false, 'RH não vê inbox com env dedicado');
assert(canVisualizarAjuda('colaborador', DANIEL) === false, 'colaborador comum não vê inbox');

// Legado sem env
delete process.env.NEXT_PUBLIC_AJUDA_RESPONSAVEL_COLABORADOR_ID;
delete process.env.AJUDA_RESPONSAVEL_COLABORADOR_ID;

assert(canResponderAjudaFinal(OUTRO, 'rh'), 'RH responde sem env dedicado');
assert(canResponderAjudaFinal(OUTRO, 'admin'), 'admin responde sem env');
assert(canVisualizarAjuda('rh', OUTRO), 'RH vê inbox sem env dedicado');

console.log('\nTodos os testes de roles do Inbox ajuda passaram.');
