/**
 * Teste puro de grafia de setor (sem Supabase).
 * Uso: node scripts/test-setor-match.mjs
 */
import assert from 'node:assert/strict';

function textoSetorNorm(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function normalizarSetorOrganizacional(setor) {
  const s = String(setor ?? '').trim();
  if (!s) return '';
  if (textoSetorNorm(s) === textoSetorNorm('Estoque')) return 'CD';
  return s;
}

function setorOrganogramaCoincide(a, b) {
  const na = textoSetorNorm(normalizarSetorOrganizacional(a));
  const nb = textoSetorNorm(normalizarSetorOrganizacional(b));
  return Boolean(na && nb && na === nb);
}

const SETORES = [
  'Cozinha loja',
  'Atendimento',
  'Copa',
  'Caixa',
  'ASG',
  'Fábrica de doces',
  'Fábrica de preparos',
  'Administração',
  'Escritório',
  'CD',
  'Motorista',
  'RH',
  'Supervisão',
  'Marketing',
];

function resolverSetorCadastro(s) {
  if (!s || !s.trim()) return null;
  const t = s.trim();
  if (textoSetorNorm(t) === textoSetorNorm('Estoque')) return 'Estoque';
  return SETORES.find((nome) => textoSetorNorm(nome) === textoSetorNorm(t)) ?? null;
}

assert.equal(resolverSetorCadastro('Fabrica de preparos'), 'Fábrica de preparos');
assert.equal(resolverSetorCadastro('FÁBRICA DE DOCES'), 'Fábrica de doces');
assert.equal(resolverSetorCadastro('estoque'), 'Estoque');
assert.equal(setorOrganogramaCoincide('Estoque', 'CD'), true);
assert.equal(setorOrganogramaCoincide('Fabrica de Preparos', 'Fábrica de preparos'), true);
assert.equal(setorOrganogramaCoincide('Atendimento', 'Cozinha loja'), false);
assert.equal(resolverSetorCadastro('Setor inventado'), null);

console.log('ok test-setor-match');
