'use client';

import Link from 'next/link';
import { AniversariantesReconhecimento } from '@/components/mural/AniversariantesReconhecimento';

export default function AniversariantesPage() {
  return (
    <main className="space-y-6 max-w-2xl">
      <div>
        <Link href="/portal/mural" className="text-sm text-dourado-base hover:underline font-medium">
          ← Voltar ao mural
        </Link>
        <h1 className="text-2xl md:text-3xl font-display font-semibold text-cafeteria-900 mt-2">
          Aniversariantes do mês
        </h1>
        <p className="text-sm md:text-base text-cafeteria-600 mt-2">
          Lista com base na <strong>data de nascimento</strong> cadastrada (não confundir com data de admissão).
          Sócios e administradores também aparecem aqui quando o nascimento está no perfil ou no cadastro RH.
        </p>
      </div>
      <AniversariantesReconhecimento />
    </main>
  );
}
