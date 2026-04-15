import Image from 'next/image';
import Link from 'next/link';
import {
  BookOpen,
  BriefcaseBusiness,
  ChefHat,
  Crown,
  GlassWater,
  Package,
  Sparkles,
  UserCircle,
} from 'lucide-react';

const MANUAL_BASE = '/manuais';

function manualHref(filename: string) {
  return `${MANUAL_BASE}/${encodeURIComponent(filename)}`;
}

const manuals = [
  {
    title: 'Cultura e conduta',
    description: 'Identidade, postura e ética que unem todas as unidades Gabi Fontes.',
    file: 'Manual do colaborador (Geral).html',
    icon: BookOpen,
  },
  {
    title: 'Atendentes',
    description: 'A arte de receber: salão, cardápio e experiência memorável.',
    file: 'Manual do Atendimento.html',
    icon: UserCircle,
  },
  {
    title: 'Cozinha',
    description: 'Excelência na produção, segurança alimentar e padrão em cada prato.',
    file: 'Manual do Auxiliar de Cozinha.html',
    icon: ChefHat,
  },
  {
    title: 'Estoque',
    description: 'Controle de insumos e rotinas de armazenamento — documento em elaboração.',
    file: null as string | null,
    icon: Package,
    soon: true,
  },
  {
    title: 'ADM / RH',
    description: 'Sustentação administrativa, pessoas, processos e financeiro.',
    file: 'Manual do ADM e RH.html',
    icon: BriefcaseBusiness,
  },
  {
    title: 'ASG',
    description: 'Ambiente seguro e acolhedor: limpeza, higiene e primeira impressão.',
    file: 'Manual do ASG.html',
    icon: Sparkles,
  },
  {
    title: 'Copa',
    description: 'Organização da copa, apoio ao salão e padrão de atendimento.',
    file: 'Manual da Copa.html',
    icon: GlassWater,
  },
  {
    title: 'Liderança e gestão',
    description: 'Visão de loja, equipe e resultados para quem conduz a operação.',
    file: 'Manual do Gerente.html',
    icon: Crown,
  },
] as const;

export default function HomePage() {
  return (
    <div className="min-h-screen bg-portal-bg font-portal text-portal-ink antialiased">
      <header className="border-b border-black/[0.06] bg-portal-bg/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl flex-col items-center px-4 py-8 sm:py-10">
          <div className="relative h-16 w-auto sm:h-20">
            <Image
              src="/manuais/assets/logo-gabi-fontes-transparent.png"
              alt="Gabi Fontes — Cafeteria e Doceria"
              width={320}
              height={120}
              className="h-full w-auto object-contain"
              priority
            />
          </div>
          <p className="mt-4 max-w-xl text-center font-display text-xl text-portal-ink sm:text-2xl">
            Portal do Colaborador
          </p>
          <p className="mt-2 max-w-md text-center text-sm font-medium leading-relaxed text-portal-inkMuted sm:text-base">
            Boas-vindas à sua central de cultura, processos e manuais oficiais.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-16 pt-8 sm:px-6">
        <section aria-labelledby="video-heading" className="mb-12 sm:mb-14">
          <h2 id="video-heading" className="font-display text-2xl text-portal-ink sm:text-3xl">
            Mensagem de boas-vindas
          </h2>
          <p className="mt-2 text-sm text-portal-inkMuted sm:text-base">
            Assista ao vídeo institucional assim que estiver disponível.
          </p>
          <div
            className="relative mt-6 aspect-video w-full overflow-hidden rounded-2xl shadow-[0_12px_40px_rgba(75,54,33,0.12)] ring-1 ring-black/[0.06]"
            role="img"
            aria-label="Placeholder: vídeo em produção"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[#fdf8f5] via-portal-roseHover/40 to-portal-rose/60" />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 shadow-md ring-1 ring-portal-rose/80">
                <svg
                  className="ml-1 h-8 w-8 text-portal-ink/70"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
              <p className="font-display text-lg text-portal-ink sm:text-xl">Vídeo em produção</p>
              <p className="max-w-sm text-sm text-portal-inkMuted">
                Em breve, o conteúdo de boas-vindas estará disponível neste espaço.
              </p>
            </div>
          </div>
        </section>

        <section aria-labelledby="manuais-heading">
          <h2 id="manuais-heading" className="font-display text-2xl text-portal-ink sm:text-3xl">
            Manuais por função
          </h2>
          <p className="mt-2 text-sm text-portal-inkMuted sm:text-base">
            Toque ou clique no card para abrir o manual em nova aba.
          </p>

          <ul className="mt-8 grid list-none gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
            {manuals.map((item) => {
              const Icon = item.icon;
              const inner = (
                <>
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/90 text-portal-ink shadow-sm ring-1 ring-portal-rose/50 transition-colors duration-300 group-hover:bg-portal-roseHover/80 group-hover:ring-portal-rose">
                    <Icon className="h-6 w-6" strokeWidth={1.75} aria-hidden />
                  </span>
                  <span className="mt-4 block font-display text-lg leading-snug text-portal-ink">
                    {item.title}
                  </span>
                  <span className="mt-2 block text-sm leading-relaxed text-portal-inkMuted">
                    {item.description}
                  </span>
                  {'soon' in item && item.soon ? (
                    <span className="mt-4 inline-flex rounded-full bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-portal-inkMuted ring-1 ring-portal-rose/60">
                      Em breve
                    </span>
                  ) : null}
                </>
              );

              if (item.file) {
                return (
                  <li key={item.title}>
                    <a
                      href={manualHref(item.file)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex min-h-[160px] flex-col rounded-2xl border border-black/[0.06] bg-white/70 p-5 shadow-sm outline-none transition-all duration-300 hover:scale-[1.02] hover:border-portal-rose/50 hover:bg-portal-roseHover/50 hover:shadow-md focus-visible:ring-2 focus-visible:ring-portal-ink/20 active:scale-[0.99] sm:min-h-[180px] sm:p-6"
                    >
                      {inner}
                    </a>
                  </li>
                );
              }

              return (
                <li key={item.title}>
                  <div
                    className="flex min-h-[160px] flex-col rounded-2xl border border-dashed border-portal-rose/60 bg-white/40 p-5 opacity-90 sm:min-h-[180px] sm:p-6"
                    aria-disabled
                  >
                    {inner}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="mt-14 flex flex-col items-center gap-4 border-t border-black/[0.06] pt-10 text-center sm:mt-16">
          <Link
            href="/login"
            className="inline-flex min-h-[48px] min-w-[200px] items-center justify-center rounded-xl bg-portal-ink px-8 py-3 text-sm font-semibold text-portal-bg shadow-md transition hover:bg-portal-ink/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-portal-ink"
          >
            Entrar com CPF
          </Link>
          <Link
            href="/admin"
            className="text-sm font-medium text-portal-inkMuted underline-offset-4 transition hover:text-portal-ink hover:underline"
          >
            Acesso administrativo
          </Link>
        </section>
      </main>
    </div>
  );
}
