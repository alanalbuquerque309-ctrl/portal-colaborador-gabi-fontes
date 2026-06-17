import { IlustracaoCafe, IlustracaoGraos, IlustracaoMegafone, IlustracaoTrofeu } from './PortalIlustracao';

const FRASES = {
  home: { texto: 'Café é sobre conexão, e conexão transforma.', Ilust: IlustracaoCafe },
  graos: { texto: 'Gente que faz acontecer todos os dias!', Ilust: IlustracaoGraos },
  mural: { texto: 'Reconhecimento que inspira e transforma!', Ilust: IlustracaoTrofeu },
  comunicacao: { texto: 'Comunicar é cuidar.', Ilust: IlustracaoMegafone },
} as const;

export function PortalRodapeFrase({ variant }: { variant: keyof typeof FRASES }) {
  const { texto, Ilust } = FRASES[variant];
  return (
    <footer className="rounded-2xl border border-cafeteria-200/60 bg-gradient-to-br from-cream-50 to-portal-bg/80 px-5 py-6 text-center">
      <div className="flex justify-center mb-3 opacity-90">
        <Ilust className="w-20 h-16 sm:w-24 sm:h-20" />
      </div>
      <p className="font-display text-base sm:text-lg text-cafeteria-800 italic leading-snug">{texto}</p>
    </footer>
  );
}
