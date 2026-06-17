import Image from 'next/image';
import { IlustracaoGraos, IlustracaoMegafone, IlustracaoTrofeu } from './PortalIlustracao';

const FRASES = {
  home: { texto: 'Café é sobre conexão, e conexão transforma.' },
  graos: { texto: 'Gente que faz acontecer todos os dias!', Ilust: IlustracaoGraos },
  mural: { texto: 'Reconhecimento que inspira e transforma!', Ilust: IlustracaoTrofeu },
  comunicacao: { texto: 'Comunicar é cuidar.', Ilust: IlustracaoMegafone },
} as const;

export function PortalRodapeFrase({ variant }: { variant: keyof typeof FRASES }) {
  const { texto } = FRASES[variant];
  const Ilust = 'Ilust' in FRASES[variant] ? FRASES[variant].Ilust : null;

  return (
    <footer className="rounded-2xl border border-cafeteria-200/60 bg-gradient-to-br from-cream-50 to-portal-bg/80 px-5 py-6 text-center">
      <div className="flex justify-center mb-3">
        {variant === 'home' ? (
          <Image
            src="/logo-gabi-fontes.png"
            alt="Gabi Fontes — Cafeteria & Doceria"
            width={200}
            height={144}
            className="h-14 sm:h-16 w-auto object-contain"
          />
        ) : Ilust ? (
          <Ilust className="w-20 h-16 sm:w-24 sm:h-20 opacity-90" />
        ) : null}
      </div>
      <p className="font-display text-base sm:text-lg text-cafeteria-800 italic leading-snug">{texto}</p>
    </footer>
  );
}
