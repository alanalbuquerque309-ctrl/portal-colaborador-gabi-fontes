'use client';

import Link from 'next/link';

export function Header() {
  return (
    <header className="bg-cream-100/80 backdrop-blur border-b border-cafeteria-200">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/portal" className="font-display text-xl text-cafeteria-800 font-semibold">
          Gabi Fontes
        </Link>
        <nav className="flex gap-6 text-cafeteria-700">
          <Link href="/portal/mural" className="hover:text-cafeteria-900">
            Mural
          </Link>
          <Link href="/portal/aniversariantes" className="hover:text-cafeteria-900">
            Mural da Família
          </Link>
          <Link href="/portal/escala" className="hover:text-cafeteria-900">
            Minha escala
          </Link>
          <Link href="/portal/sugestoes" className="hover:text-cafeteria-900">
            Sugestões
          </Link>
          <Link href="/portal/perfil" className="hover:text-cafeteria-900">
            Meu perfil
          </Link>
        </nav>
      </div>
    </header>
  );
}
