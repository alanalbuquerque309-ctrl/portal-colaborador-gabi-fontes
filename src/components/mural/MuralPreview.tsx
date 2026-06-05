'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getPortalSession } from '@/lib/utils/session';
import { XicaraCarregando } from '@/components/ui/XicaraCarregando';
import { MuralRankingsMensais } from '@/components/mural/MuralRankingsMensais';

interface Aviso {
  id: string;
  titulo: string;
  conteudo: string | null;
  data_publicacao: string;
  unidade_nome?: string;
}

export function MuralPreview() {
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [loading, setLoading] = useState(true);
  const [semSessao, setSemSessao] = useState(false);

  useEffect(() => {
    const session = getPortalSession();
    if (!session?.colaboradorId) {
      setSemSessao(true);
      setLoading(false);
      return;
    }

    fetch('/api/portal/avisos', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        if (data.ok && Array.isArray(data.avisos)) {
          setAvisos(data.avisos.slice(0, 3));
        }
      })
      .finally(() => setLoading(false));
  }, []);

  if (semSessao) {
    return (
      <div className="rounded-xl border border-dourado-200 bg-cream-50 p-6">
        <p className="text-coffee-base">Faça login para ver o mural.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-dourado-200 bg-cream-50 p-6 flex justify-center">
        <XicaraCarregando size="sm" label="Carregando mural…" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold text-cafeteria-800 mb-1">Destaques do mês (acumulado)</h3>
        <p className="text-sm text-cafeteria-600 mb-3 leading-relaxed">
          Médias das avaliações semanais somadas no mês. No final do mês ficam os 3 primeiros da rede e de cada
          unidade.
        </p>
        <MuralRankingsMensais />
      </div>
      {avisos.length > 0 ? (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-cafeteria-800">Últimos avisos</h3>
          {avisos.map((a) => (
            <article key={a.id} className="rounded-xl border border-dourado-200 bg-cream-50 p-4 shadow-sm">
              <h4 className="font-display font-semibold text-coffee-base mb-1">{a.titulo}</h4>
              {a.conteudo && <p className="text-coffee-100 text-sm leading-relaxed">{a.conteudo}</p>}
            </article>
          ))}
        </div>
      ) : (
        <p className="text-sm text-cafeteria-600">Nenhum aviso publicado pela administração no momento.</p>
      )}
      <Link href="/portal/mural" className="text-sm text-dourado-base font-medium hover:underline">
        Ver mural completo →
      </Link>
    </div>
  );
}
