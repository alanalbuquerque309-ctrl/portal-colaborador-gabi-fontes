'use client';

import { useEffect, useState } from 'react';
import { getPortalSession } from '@/lib/utils/session';
import type { CafeConectaResumoPerfil } from '@/lib/cafe-conecta/types';

export function CafeConectaPerfilBloco() {
  const [resumo, setResumo] = useState<CafeConectaResumoPerfil | null>(null);
  const [carregou, setCarregou] = useState(false);

  useEffect(() => {
    const session = getPortalSession();
    if (!session?.colaboradorId) {
      setCarregou(true);
      return;
    }

    fetch('/api/portal/cafe-conecta/perfil', { credentials: 'include', cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        if (data.ok && data.resumo) setResumo(data.resumo);
      })
      .finally(() => setCarregou(true));
  }, []);

  if (!carregou || !resumo || resumo.total_participacoes === 0) return null;

  return (
    <section className="mt-8 rounded-2xl border border-cafeteria-200 bg-cream-50/80 p-5">
      <h2 className="text-lg font-display font-semibold text-coffee-base flex items-center gap-2">
        <span aria-hidden>☕</span> Café Conecta
      </h2>
      <p className="text-sm text-cafeteria-600 mt-1">
        {resumo.total_participacoes} participação(ões)
        {resumo.dias_desde_ultima != null
          ? ` · última há ${resumo.dias_desde_ultima} dia(s)`
          : ''}
      </p>
      <ul className="mt-3 space-y-2">
        {resumo.participacoes.map((p) => (
          <li key={p.sorteio_id} className="text-sm text-coffee-base rounded-lg bg-white border border-cream-200 px-3 py-2">
            <span className="text-cafeteria-500">
              {new Date(p.data_referencia + 'T12:00:00').toLocaleDateString('pt-BR')}
            </span>
            {' · '}
            com <span className="font-medium">{p.parceiro_nome}</span>
            <span className="text-cafeteria-600"> ({p.parceiro_setor})</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
