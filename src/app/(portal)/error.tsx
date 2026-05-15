'use client';

import { useEffect } from 'react';

export default function PortalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[portal]', error);
  }, [error]);

  return (
    <main className="max-w-lg mx-auto py-12 px-4 text-center space-y-4">
      <h1 className="text-xl font-semibold text-cafeteria-900">Algo falhou nesta página</h1>
      <p className="text-sm text-cafeteria-600">
        Tente recarregar. Se continuar, use outro menu (ex.: Mural) ou saia e entre de novo.
      </p>
      <div className="flex flex-wrap gap-2 justify-center">
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-lg bg-coffee-base px-4 py-2 text-sm font-medium text-cream-100"
        >
          Tentar de novo
        </button>
        <a href="/portal/mural" className="rounded-lg border border-cafeteria-200 px-4 py-2 text-sm text-cafeteria-800">
          Ir ao mural
        </a>
      </div>
    </main>
  );
}
