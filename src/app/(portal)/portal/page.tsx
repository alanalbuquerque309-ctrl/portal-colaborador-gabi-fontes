import Link from 'next/link';
import { MuralPreview } from '@/components/mural/MuralPreview';
import { DestaqueSection } from '@/components/destaque/DestaqueSection';
import { AvaliacoesPortalHome } from '@/components/portal/AvaliacoesPortalHome';
import { TermometroEmocional } from '@/components/emocional/TermometroEmocional';
import { EmocionalAlertasGestao } from '@/components/emocional/EmocionalAlertasGestao';

export default function PortalHomePage() {
  return (
    <main className="space-y-8">
      <EmocionalAlertasGestao />
      <DestaqueSection />
      <section className="rounded-2xl border border-dourado-base/40 bg-gradient-to-br from-cream-50 to-white p-5 shadow-sm">
        <h2 className="text-lg font-display font-semibold text-cafeteria-900">Manuais oficiais</h2>
        <p className="text-sm text-cafeteria-600 mt-1">
          Vídeo de boas-vindas, manual da cultura e manual do seu setor — os mesmos do onboarding, para revisar quando quiser.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/portal/manuais#video-institucional"
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-dourado-base px-5 py-2.5 text-sm font-medium text-cream-100 hover:bg-dourado-400"
          >
            Assistir vídeo institucional
          </Link>
          <Link
            href="/portal/manuais"
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-dourado-base/50 px-5 py-2.5 text-sm font-medium text-cafeteria-800 hover:bg-cream-50"
          >
            Ver todos os manuais
          </Link>
        </div>
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
          Mural
        </h2>
        <MuralPreview />
      </section>
    </main>
  );
}
