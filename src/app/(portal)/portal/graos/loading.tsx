import { PortalPaginaCarregando } from '@/components/ui/PortalPaginaCarregando';
import { getTermoCurto } from '@/lib/tenant/terminology';

export default function GraosLoading() {
  return <PortalPaginaCarregando label={`Carregando ${getTermoCurto('reconhecimento')}…`} />;
}
