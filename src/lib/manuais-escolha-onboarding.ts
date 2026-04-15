import type { ManualRef } from '@/lib/manual-por-setor';

/**
 * Manuais disponíveis na etapa "escolha do seu manual" (após o Manual Geral + quiz).
 * O geral já foi obrigatório antes; aqui listamos os específicos por função/setor.
 */
export const MANUAIS_ESCOLHA_POS_GERAL: ManualRef[] = [
  { file: 'Manual do Gerente.html', titulo: 'Liderança e gestão' },
  { file: 'Manual do Auxiliar de Cozinha.html', titulo: 'Cozinha / preparo' },
  { file: 'Manual do Atendimento.html', titulo: 'Atendimento' },
  { file: 'Manual do ASG.html', titulo: 'ASG / limpeza e higiene' },
  { file: 'Manual da Copa.html', titulo: 'Copa' },
  { file: 'Manual do ADM e RH.html', titulo: 'Administrativo e RH' },
];
