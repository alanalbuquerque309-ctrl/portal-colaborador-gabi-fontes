import Image from 'next/image';
import { IlustracaoGraos, IlustracaoMegafone, IlustracaoTrofeu } from './PortalIlustracao';

const FRASES = {
  home: { texto: 'Café é sobre conexão, e conexão transforma.' },
  graos: { texto: 'Gente que faz acontecer todos os dias!' },
  mural: { texto: 'Reconhecimento que inspira e transforma!' },
  comunicacao: { texto: 'Comunicar é cuidar.' },
} as const;

const ILUST_CLASS = 'w-20 h-16 sm:w-24 sm:h-20 opacity-90';

function RodapeIcone({ variant }: { variant: keyof typeof FRASES }) {
  switch (variant) {
    case 'home':
      return (
        <Image
          src="/logo-gabi-fontes.png"
          alt="Gabi Fontes — Cafeteria & Doceria"
          width={200}
          height={144}
          className="h-14 sm:h-16 w-auto object-contain"
        />
      );
    case 'graos':
      return <IlustracaoGraos className={ILUST_CLASS} />;
    case 'mural':
      return <IlustracaoTrofeu className={ILUST_CLASS} />;
    case 'comunicacao':
      return <IlustracaoMegafone className={ILUST_CLASS} />;
  }
}

export function PortalRodapeFrase({ variant }: { variant: keyof typeof FRASES }) {
  const { texto } = FRASES[variant];

  return (
    <footer className="rounded-2xl border border-cafeteria-200/60 bg-gradient-to-br from-cream-50 to-portal-bg/80 px-5 py-6 text-center">
      <div className="flex justify-center mb-3">
        <RodapeIcone variant={variant} />
      </div>
      <p className="font-display text-base sm:text-lg text-cafeteria-800 italic leading-snug">{texto}</p>
    </footer>
  );
}
