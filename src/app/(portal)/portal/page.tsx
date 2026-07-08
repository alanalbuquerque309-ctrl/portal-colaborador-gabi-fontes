import { AvisosHome } from '@/components/portal/AvisosHome';
import { CafeConectaHomeCard } from '@/components/portal/CafeConectaHomeCard';
import { DestaqueSection } from '@/components/destaque/DestaqueSection';
import { SugestoesEquipeHome } from '@/components/portal/SugestoesEquipeHome';
import { PortalAtalhosPerfil } from '@/components/portal/PortalAtalhosPerfil';
import { TermometroEmocional } from '@/components/emocional/TermometroEmocional';
import { EmocionalAlertasGestao } from '@/components/emocional/EmocionalAlertasGestao';
import { PortalRodapeFrase } from '@/components/portal/vivo/PortalRodapeFrase';
import { PortalHomeEntrada } from '@/components/portal/home/PortalHomeEntrada';
import { PortalHomeSecaoAdiada } from '@/components/portal/PortalHomeSecaoAdiada';
import { PortalHomeGrupo } from '@/components/portal/home/PortalHomeGrupo';
import { ManuaisHomeButton } from '@/components/portal/ManuaisHomeButton';

export default function PortalHomePage() {
  return (
    <main className="space-y-8">
      <div className="space-y-8">
        <EmocionalAlertasGestao />
        <PortalHomeEntrada />
        <PortalHomeSecaoAdiada minHeight="5rem" delayMs={400}>
          <AvisosHome />
        </PortalHomeSecaoAdiada>

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
            <ManuaisHomeButton />
          </PortalHomeSecaoAdiada>
        </PortalHomeGrupo>

        <PortalHomeSecaoAdiada minHeight="8rem">
          <section id="termometro-emocoes" className="rounded-2xl border border-terracota-200/70 bg-gradient-to-br from-terracota-50/60 via-white to-cream-50 p-4 sm:p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <span
                aria-hidden
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-terracota-100 text-terracota-600 text-xl"
              >
                🌡️
              </span>
              <div>
                <h2 className="text-xl font-display font-semibold text-cafeteria-900">Termômetro de emoções</h2>
                <p className="text-sm text-cafeteria-600 mt-0.5">
                  Registre como está hoje. Só administração, RH e sócios veem sua resposta.
                </p>
              </div>
            </div>
            <TermometroEmocional />
          </section>
        </PortalHomeSecaoAdiada>
        <PortalRodapeFrase variant="home" />
      </div>
    </main>
  );
}
