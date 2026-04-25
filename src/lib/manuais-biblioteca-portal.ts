/**
 * Lista canónica dos manuais HTML por função (biblioteca do portal).
 * Usar sempre este ficheiro como fonte única para /portal/manuais e listagens equivalentes.
 */
export type ManualBibliotecaItem = { titulo: string; file: string };

export const MANUAIS_SETORIAIS_BIBLIOTECA: ManualBibliotecaItem[] = [
  { titulo: 'Manual de liderança e gestão', file: 'Manual do Gerente.html' },
  { titulo: 'Manual da cozinha', file: 'Manual do Auxiliar de Cozinha.html' },
  { titulo: 'Manual de atendimento', file: 'Manual do Atendimento.html' },
  { titulo: 'Manual ASG', file: 'Manual do ASG.html' },
  { titulo: 'Manual da copa', file: 'Manual da Copa.html' },
  { titulo: 'Manual de estoque', file: 'Manual do Estoquista.html' },
  { titulo: 'Manual ADM / RH', file: 'Manual do ADM e RH.html' },
];
