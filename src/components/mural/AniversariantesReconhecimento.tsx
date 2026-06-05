'use client';

import { useEffect, useState } from 'react';
import { getPortalSession } from '@/lib/utils/session';
import { XicaraCarregando } from '@/components/ui/XicaraCarregando';

type Aniversariante = {
  id: string;
  nome: string;
  data_nascimento: string | null;
  foto_url?: string | null;
  unidade_nome: string;
};

function diaDoMes(dataIso: string | null): number {
  if (!dataIso) return 32;
  return new Date(dataIso).getDate();
}

function formatarDataAniversario(dataIso: string | null): string {
  if (!dataIso) return '';
  return new Date(dataIso).toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'long',
  });
}

function rotuloMesAtual(): string {
  return new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

export function AniversariantesReconhecimento() {
  const [aniversariantes, setAniversariantes] = useState<Aniversariante[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const session = getPortalSession();
    if (!session?.colaboradorId) {
      setLoading(false);
      return;
    }

    fetch('/api/portal/aniversariantes', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        if (data.ok && Array.isArray(data.aniversariantes)) {
          const ordenados = [...(data.aniversariantes as Aniversariante[])].sort(
            (a, b) =>
              diaDoMes(a.data_nascimento) - diaDoMes(b.data_nascimento) ||
              a.nome.localeCompare(b.nome, 'pt-BR')
          );
          setAniversariantes(ordenados);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-4">
        <XicaraCarregando size="sm" label="Carregando aniversariantes…" />
      </div>
    );
  }

  return (
    <section>
      <h3 className="text-sm font-semibold text-cafeteria-800 mb-3">
        Aniversariantes de {rotuloMesAtual()}
      </h3>
      {aniversariantes.length === 0 ? (
        <p className="text-sm text-cafeteria-600 rounded-xl border border-dourado-200 bg-cream-50 p-4">
          Nenhum aniversariante neste mês. Parabéns a todos da família Gabi Fontes!
        </p>
      ) : (
        <ul className="space-y-2">
          {aniversariantes.map((a) => (
            <li
              key={a.id}
              className="rounded-lg border border-dourado-200 bg-white/90 px-3 py-2.5 flex items-center gap-3"
            >
              {a.foto_url ? (
                <img
                  src={a.foto_url}
                  alt=""
                  className="w-10 h-10 rounded-full object-cover border border-dourado-200 shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-dourado-100 flex items-center justify-center border border-dourado-200 shrink-0">
                  <span className="text-dourado-600 font-display text-sm">
                    {a.nome?.charAt(0)?.toUpperCase() ?? '?'}
                  </span>
                </div>
              )}
              <div className="min-w-0 flex-1">
                <span className="font-medium text-coffee-base text-base block leading-snug break-words">{a.nome}</span>
                <span className="text-sm text-cafeteria-600">
                  {formatarDataAniversario(a.data_nascimento)}
                  {a.unidade_nome ? ` · ${a.unidade_nome}` : ''}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
