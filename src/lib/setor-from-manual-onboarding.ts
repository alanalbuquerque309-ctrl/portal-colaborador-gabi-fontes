import { isSetorValido } from '@/lib/constants/colaborador-org';

/** Manual escolhido no onboarding → setor cadastral (quando ainda não veio do admin). */
const MANUAL_PARA_SETOR: Record<string, string> = {
  'Manual do Atendimento.html': 'Atendimento',
  'Manual do ASG.html': 'ASG',
  'Manual do Auxiliar de Cozinha.html': 'Cozinha loja',
  'Manual da Copa.html': 'Copa',
  'Manual do Estoquista.html': 'CD',
  'Manual do ADM e RH.html': 'Escritório',
  'Manual do Gerente.html': 'Supervisão',
};

export function setorFromManualOnboardingFile(file: string | null | undefined): string | null {
  const s = file ? MANUAL_PARA_SETOR[file] : null;
  if (!s || !isSetorValido(s)) return null;
  return s;
}
