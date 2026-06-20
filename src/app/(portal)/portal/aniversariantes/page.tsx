import { AniversariantesReconhecimento } from '@/components/mural/AniversariantesReconhecimento';
import { PortalPageHeader } from '@/components/portal/shell/PortalPageHeader';
import { PortalSection } from '@/components/portal/shell/PortalSection';

export default function AniversariantesPage() {
  return (
    <main className="space-y-6">
      <PortalPageHeader
        title="Aniversariantes do mês"
        description="Lista com base na data de nascimento cadastrada (não confundir com data de admissão). Sócios e administradores também aparecem quando o nascimento está no perfil."
        backHref="/portal/mural"
        backLabel="Voltar ao mural"
        breadcrumb={[
          { label: 'Portal', href: '/portal' },
          { label: 'Mural', href: '/portal/mural' },
          { label: 'Aniversariantes' },
        ]}
      />

      <PortalSection title="Equipe que celebra este mês">
        <AniversariantesReconhecimento variant="full" />
      </PortalSection>
    </main>
  );
}
