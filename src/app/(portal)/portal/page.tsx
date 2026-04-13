import { MuralPreview } from '@/components/mural/MuralPreview';
import { AniversariantesPreview } from '@/components/aniversariantes/AniversariantesPreview';
import { DestaqueSection } from '@/components/destaque/DestaqueSection';
import { AvaliacoesPortalHome } from '@/components/portal/AvaliacoesPortalHome';
import { TermometroEmocional } from '@/components/emocional/TermometroEmocional';

export default function PortalHomePage() {
  return (
    <main className="space-y-8">
      <DestaqueSection />
      <AvaliacoesPortalHome />
      <section>
        <h2 className="text-2xl font-display font-semibold text-cafeteria-800 mb-4">
          Termômetro de emoções
        </h2>
        <TermometroEmocional />
      </section>
      <section>
        <h2 className="text-2xl font-display font-semibold text-cafeteria-800 mb-4">
          Mural da Sua Unidade
        </h2>
        <MuralPreview />
      </section>
      <section>
        <h2 className="text-2xl font-display font-semibold text-cafeteria-800 mb-4">
          Mural da Família — Aniversariantes do Mês
        </h2>
        <AniversariantesPreview />
      </section>
    </main>
  );
}
