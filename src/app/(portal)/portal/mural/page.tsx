import { MuralUnidade } from '@/components/mural/MuralUnidade';
import { MuralRankingsMensais } from '@/components/mural/MuralRankingsMensais';
import { LiderInspiradorBanner } from '@/components/portal/LiderInspiradorBanner';
import { IlustracaoTrofeu } from '@/components/portal/vivo/PortalIlustracao';
import { PortalRodapeFrase } from '@/components/portal/vivo/PortalRodapeFrase';

export default function MuralPage() {
  return (
    <main className="space-y-8">
      <div className="rounded-2xl border border-dourado-200/70 bg-gradient-to-br from-dourado-50/50 via-cream-50 to-white p-5 overflow-hidden">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-semibold text-cafeteria-800">Mural</h1>
            <p className="text-sm text-cafeteria-600 mt-1 max-w-xl leading-relaxed">
              Rankings cumulativos do mês e avisos da unidade. Reconhecimento que inspira a equipe.
            </p>
          </div>
          <IlustracaoTrofeu className="w-20 h-20 shrink-0 opacity-95" />
        </div>
      </div>
      <section>
        <h2 className="text-xl font-display font-semibold text-cafeteria-800 mb-3">Líder Inspirador</h2>
        <LiderInspiradorBanner />
      </section>
      <section>
        <h2 className="text-xl font-display font-semibold text-cafeteria-800 mb-1">Destaques do mês</h2>
        <p className="text-sm text-cafeteria-600 mb-4">
          Média das notas semanais no mês e troféus somados. Atualiza a cada nova avaliação ou troféu.
        </p>
        <MuralRankingsMensais />
      </section>
      <section>
        <h2 className="text-xl font-display font-semibold text-cafeteria-800 mb-3">Avisos da unidade</h2>
        <MuralUnidade />
      </section>
      <PortalRodapeFrase variant="mural" />
    </main>
  );
}
