import Link from 'next/link';
import { AvisosHome } from '@/components/portal/AvisosHome';
import { CafeConectaHomeCard } from '@/components/portal/CafeConectaHomeCard';
import { DestaqueSection } from '@/components/destaque/DestaqueSection';
import { SugestoesEquipeHome } from '@/components/portal/SugestoesEquipeHome';
import { PortalAtalhosPerfil } from '@/components/portal/PortalAtalhosPerfil';
import { TermometroEmocional } from '@/components/emocional/TermometroEmocional';
import { TermometroHomeGate } from '@/components/emocional/TermometroHomeGate';
import { EmocionalAlertasGestao } from '@/components/emocional/EmocionalAlertasGestao';
import { PortalRodapeFrase } from '@/components/portal/vivo/PortalRodapeFrase';
import { PortalHomeEntrada } from '@/components/portal/home/PortalHomeEntrada';
import { PortalHomeSecaoAdiada } from '@/components/portal/PortalHomeSecaoAdiada';
import { PortalHomeGrupo } from '@/components/portal/home/PortalHomeGrupo';

export default function PortalHomePage() {
  return (
    <main className="space-y-8">
      <div className="space-y-8">
        <EmocionalAlertasGestao />
        <PortalHomeEntrada />
        <AvisosHome />

        <PortalHomeGrupo titulo="Esta semana" subtitulo="Cultura, reconhecimento e novidades." cor="uva" icone="estrela">
          <PortalHomeSecaoAdiada minHeight="7rem">
            <CafeConectaHomeCard />
          </PortalHomeSecaoAdiada>
          <PortalHomeSecaoAdiada minHeight="10rem">
            <DestaqueSection />
          </PortalHomeSecaoAdiada>
          <PortalHomeSecaoAdiada minHeight="8rem">
            <SugestoesEquipeHome />
          </PortalHomeSecaoAdiada>
        </PortalHomeGrupo>

        <PortalHomeGrupo titulo="Mais informações" subtitulo="Acesso rápido e materiais oficiais." cor="oceano" icone="livro">
          <PortalHomeSecaoAdiada minHeight="4rem">
            <PortalAtalhosPerfil />
          </PortalHomeSecaoAdiada>
          <PortalHomeSecaoAdiada minHeight="4rem">
            <section className="rounded-2xl border border-oceano-200/70 bg-gradient-to-br from-oceano-50/70 via-white to-cream-50 overflow-hidden shadow-sm">
              <details className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 hover:bg-oceano-50/50 transition-colors [&::-webkit-details-marker]:hidden">
                  <div className="flex items-center gap-3">
                    <span
                      aria-hidden
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-oceano-100 text-oceano-600 text-xl"
                    >
                      📘
                    </span>
                    <div>
                      <h2 className="text-lg font-display font-semibold text-cafeteria-900">Manuais oficiais</h2>
                      <p className="text-sm text-cafeteria-600 mt-0.5">Vídeo, cultura e manual do seu setor.</p>
                    </div>
                  </div>
                  <svg
                    className="w-5 h-5 shrink-0 text-oceano-500 transition-transform group-open:rotate-180"
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
                <div className="px-5 pb-5 border-t border-oceano-100 pt-4">
                  <div className="flex flex-wrap gap-3">
                    <Link
                      href="/portal/manuais#video-institucional"
                      className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-dourado-base px-5 py-2.5 text-sm font-medium text-cream-100 hover:bg-dourado-400"
                    >
                      Assistir vídeo institucional
                    </Link>
                    <Link
                      href="/portal/manuais"
                      className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-oceano-300 px-5 py-2.5 text-sm font-medium text-oceano-700 hover:bg-oceano-50"
                    >
                      Ver todos os manuais
                    </Link>
                  </div>
                </div>
              </details>
            </section>
          </PortalHomeSecaoAdiada>
        </PortalHomeGrupo>

        <TermometroHomeGate>
          <PortalHomeSecaoAdiada minHeight="8rem">
            <section id="termometro-emocoes" className="rounded-2xl border border-terracota-200/70 bg-gradient-to-br from-terracota-50/60 via-white to-cream-50 p-4 sm:p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <span
                  aria-hidden
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-terracota-100 text-terracota-600 text-xl"
                >
                  💬
                </span>
                <div>
                  <h2 className="text-xl font-display font-semibold text-cafeteria-900">Termômetro de emoções</h2>
                  <p className="text-sm text-cafeteria-600 mt-0.5">Uso interno do RH. Respostas anônimas no resumo.</p>
                </div>
              </div>
              <TermometroEmocional />
            </section>
          </PortalHomeSecaoAdiada>
        </TermometroHomeGate>
        <PortalRodapeFrase variant="home" />
      </div>
    </main>
  );
}
