'use client';

import Link from 'next/link';

type Atalho = {
  href: string;
  titulo: string;
  descricao: string;
  emoji: string;
  tom: 'dourado' | 'terracota' | 'oceano' | 'uva' | 'verde';
};

const TOM: Record<Atalho['tom'], string> = {
  dourado: 'from-dourado-50/90 via-white to-cream-50 border-dourado-200/70 hover:border-dourado-base',
  terracota: 'from-terracota-50/80 via-white to-cream-50 border-terracota-200/70 hover:border-terracota-400',
  oceano: 'from-sky-50/80 via-white to-cream-50 border-sky-200/70 hover:border-sky-400',
  uva: 'from-violet-50/70 via-white to-cream-50 border-violet-200/70 hover:border-violet-400',
  verde: 'from-emerald-50/80 via-white to-cream-50 border-emerald-200/70 hover:border-emerald-400',
};

const ATALHOS_BASE: Atalho[] = [
  {
    href: '/admin/termometro-emocoes',
    titulo: 'Termômetro',
    descricao: 'Como a equipe está se sentindo hoje.',
    emoji: '🌡️',
    tom: 'terracota',
  },
  {
    href: '/admin/colaboradores',
    titulo: 'Equipe',
    descricao: 'Cadastros, setores e acessos.',
    emoji: '👥',
    tom: 'oceano',
  },
  {
    href: '/admin/checklists',
    titulo: 'Checklists',
    descricao: 'Consulta do que foi publicado nas lojas.',
    emoji: '✅',
    tom: 'verde',
  },
  {
    href: '/admin/treinamento',
    titulo: 'Treinamentos',
    descricao: 'Publicar e acompanhar a semana.',
    emoji: '🎓',
    tom: 'dourado',
  },
  {
    href: '/admin/sugestoes',
    titulo: 'Elogios e sugestões',
    descricao: 'Reconhecimento e ideias da rede.',
    emoji: '💛',
    tom: 'uva',
  },
  {
    href: '/admin/avisos',
    titulo: 'Avisos',
    descricao: 'Comunicados no mural do portal.',
    emoji: '📢',
    tom: 'dourado',
  },
];

type Props = {
  /** RH não vê checklists rede em alguns casos — ainda pode ver o atalho de consulta se permitido. */
  ocultarChecklists?: boolean;
};

export function AdminHubAtalhos({ ocultarChecklists = false }: Props) {
  const lista = ATALHOS_BASE.filter((a) => !(ocultarChecklists && a.href === '/admin/checklists'));

  return (
    <section aria-labelledby="admin-hub-atalhos" className="space-y-3">
      <div>
        <h2 id="admin-hub-atalhos" className="text-lg font-display font-semibold text-coffee-base">
          Atalhos do dia
        </h2>
        <p className="text-sm text-cafeteria-600 mt-0.5">
          O essencial para cuidar da rede — sem ruído.
        </p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {lista.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className={`group rounded-2xl border bg-gradient-to-br p-4 min-h-[108px] shadow-sm transition-all hover:shadow-md ${TOM[a.tom]}`}
          >
            <span className="text-2xl" aria-hidden>
              {a.emoji}
            </span>
            <p className="mt-2 font-semibold text-coffee-base group-hover:text-dourado-base transition-colors">
              {a.titulo}
            </p>
            <p className="text-xs text-cafeteria-600 mt-0.5 leading-snug">{a.descricao}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
