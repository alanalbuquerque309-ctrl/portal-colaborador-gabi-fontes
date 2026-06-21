import { MuralUnidade } from '@/components/mural/MuralUnidade';
import { MuralRankingsMensais } from '@/components/mural/MuralRankingsMensais';
import { AniversariantesReconhecimento } from '@/components/mural/AniversariantesReconhecimento';
import { LiderInspiradorBanner } from '@/components/portal/LiderInspiradorBanner';
import { IlustracaoTrofeu } from '@/components/portal/vivo/PortalIlustracao';
import { PortalRodapeFrase } from '@/components/portal/vivo/PortalRodapeFrase';
import { PortalPageHeader } from '@/components/portal/shell/PortalPageHeader';
import { PortalSection } from '@/components/portal/shell/PortalSection';

export default function MuralPage() {
  return (
    <main className="space-y-6">
      <PortalPageHeader
        title="Mural"
        description="Rankings cumulativos do mês, reconhecimento da equipe e avisos da unidade."
        breadcrumb={[{ label: 'Portal', href: '/portal' }, { label: 'Mural' }]}
        illustration={<IlustracaoTrofeu className="w-20 h-20 opacity-95" />}
      />

      <PortalSection title="Líder destaque" description="Melhor nota de liderança na semana.">
        <LiderInspiradorBanner />
      </PortalSection>

      <PortalSection
        title="Destaques do mês"
        description="Média das notas semanais no mês e troféus somados. Atualiza a cada nova avaliação ou troféu."
      >
        <MuralRankingsMensais />
      </PortalSection>

      <PortalSection title="Aniversariantes" description="Quem faz aniversário neste mês.">
        <AniversariantesReconhecimento variant="compact" />
      </PortalSection>

      <PortalSection title="Avisos da unidade" description="Comunicados publicados para a sua filial.">
        <MuralUnidade />
      </PortalSection>

      <PortalRodapeFrase variant="mural" />
    </main>
  );
}
