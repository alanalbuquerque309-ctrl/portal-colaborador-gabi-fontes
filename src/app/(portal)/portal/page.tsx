import Link from 'next/link';
import { DestaqueSection } from '@/components/destaque/DestaqueSection';
import { AvisosHome } from '@/components/portal/AvisosHome';
import { SugestoesEquipeHome } from '@/components/portal/SugestoesEquipeHome';
import { PortalAtalhosPerfil } from '@/components/portal/PortalAtalhosPerfil';
import { TermometroEmocional } from '@/components/emocional/TermometroEmocional';
import { EmocionalAlertasGestao } from '@/components/emocional/EmocionalAlertasGestao';
import { PortalRodapeFrase } from '@/components/portal/vivo/PortalRodapeFrase';
import { PortalHomeEntrada } from '@/components/portal/home/PortalHomeEntrada';

export default function PortalHomePage() {
  return (
    <main className="space-y-8">
      <div className="space-y-8">
        <EmocionalAlertasGestao />
        <PortalHomeEntrada />
        <AvisosHome />
        <DestaqueSection />
        <SugestoesEquipeHome />
        <PortalAtalhosPerfil />
        <section className="rounded-2xl border border-cafeteria-200 bg-white/80 overflow-hidden">
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 hover:bg-cream-50 transition-colors [&::-webkit-details-marker]:hidden">
              <div>
                <h2 className="text-lg font-display font-semibold text-cafeteria-900">Manuais oficiais</h2>
                <p className="text-sm text-cafeteria-600 mt-0.5">Vídeo, cultura e manual do seu setor.</p>
              </div>
              <svg
                className="w-5 h-5 shrink-0 text-dourado-base transition-transform group-open:rotate-180"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden
              >
                <path
                  fillRule="evenodd"
                  d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.25a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
                  clipRule="evenodd"
                />
              </svg>
            </summary>
            <div className="px-5 pb-5 border-t border-cream-200 pt-4">
              <div className="flex flex-wrap gap-3">
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
            </div>
          </details>
        </section>
        <section id="termometro-emocoes">
          <h2 className="text-xl font-display font-semibold text-cafeteria-800 mb-4">Termômetro de emoções</h2>
          <TermometroEmocional />
        </section>
        <PortalRodapeFrase variant="home" />
      </div>
    </main>
  );
}
