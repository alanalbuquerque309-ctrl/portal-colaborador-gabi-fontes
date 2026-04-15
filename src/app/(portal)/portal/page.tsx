import Link from 'next/link';
import { MuralPreview } from '@/components/mural/MuralPreview';
import { AniversariantesPreview } from '@/components/aniversariantes/AniversariantesPreview';
import { DestaqueSection } from '@/components/destaque/DestaqueSection';
import { AvaliacoesPortalHome } from '@/components/portal/AvaliacoesPortalHome';
import { TermometroEmocional } from '@/components/emocional/TermometroEmocional';

export default function PortalHomePage() {
  return (
    <main className="space-y-8">
      <DestaqueSection />
      <section className="rounded-2xl border border-dourado-base/40 bg-gradient-to-br from-cream-50 to-white p-5 shadow-sm">
        <h2 className="text-lg font-display font-semibold text-cafeteria-900">Manuais oficiais</h2>
        <p className="text-sm text-cafeteria-600 mt-1">
          Cultura, conduta e manual do seu setor — os mesmos documentos do onboarding.
        </p>
        <Link
          href="/portal/manuais"
          className="inline-flex mt-4 min-h-[44px] items-center justify-center rounded-xl bg-dourado-base px-5 py-2.5 text-sm font-medium text-cream-100 hover:bg-dourado-400"
        >
          Abrir manuais
        </Link>
      </section>
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
