import { MuralUnidade } from '@/components/mural/MuralUnidade';
import { DestaqueSection } from '@/components/destaque/DestaqueSection';

export default function MuralPage() {
  return (
    <main className="space-y-8">
      <h1 className="text-2xl font-display font-semibold text-cafeteria-800 mb-6">
        Mural
      </h1>
      <section>
        <h2 className="text-xl font-display font-semibold text-cafeteria-800 mb-3">Avisos</h2>
        <MuralUnidade />
      </section>
      <section>
        <h2 className="text-xl font-display font-semibold text-cafeteria-800 mb-3">Destaques do mês</h2>
        <DestaqueSection />
      </section>
    </main>
  );
}
