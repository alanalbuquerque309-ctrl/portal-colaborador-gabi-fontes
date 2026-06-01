import { MuralUnidade } from '@/components/mural/MuralUnidade';
import { MuralReconhecimento } from '@/components/mural/MuralReconhecimento';

export default function MuralPage() {
  return (
    <main className="space-y-8">
      <h1 className="text-2xl font-display font-semibold text-cafeteria-800 mb-6">Mural</h1>
      <section>
        <h2 className="text-xl font-display font-semibold text-cafeteria-800 mb-3">Reconhecimento automático</h2>
        <p className="text-sm text-cafeteria-600 mb-4">
          Top 3 da sua unidade (mês anterior fixo e mês atual em evolução), destaques semanais e troféus entre pares.
          Em Mesquita entram também Fábricas e Administrativo.
        </p>
        <MuralReconhecimento />
      </section>
      <section>
        <h2 className="text-xl font-display font-semibold text-cafeteria-800 mb-3">Avisos da unidade</h2>
        <MuralUnidade />
      </section>
    </main>
  );
}
