import { MuralUnidade } from '@/components/mural/MuralUnidade';

export default function MuralPage() {
  return (
    <main>
      <h1 className="text-2xl font-display font-semibold text-cafeteria-800 mb-6">
        Mural da Unidade
      </h1>
      <MuralUnidade />
    </main>
  );
}
