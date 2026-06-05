import { MuralUnidade } from '@/components/mural/MuralUnidade';
import { MuralRankingsMensais } from '@/components/mural/MuralRankingsMensais';

export default function MuralPage() {
  return (
    <main className="space-y-8">
      <h1 className="text-2xl font-display font-semibold text-cafeteria-800 mb-6">Mural</h1>
      <section>
        <h2 className="text-xl font-display font-semibold text-cafeteria-800 mb-1">Destaques do mês</h2>
        <p className="text-sm text-cafeteria-600 mb-4">
          Rankings cumulativos: média das notas semanais no mês e troféus somados. Atualiza a cada nova avaliação
          ou troféu até fechar o mês.
        </p>
        <MuralRankingsMensais />
      </section>
      <section>
        <h2 className="text-xl font-display font-semibold text-cafeteria-800 mb-3">Avisos da unidade</h2>
        <MuralUnidade />
      </section>
    </main>
  );
}
