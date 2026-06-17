import { IlustracaoMegafone } from './PortalIlustracao';

/** Megafone leve; pulsa suavemente quando há aviso ativo. */
export function MegafoneAnimado({
  ativo,
  className = 'w-20 h-16',
}: {
  ativo: boolean;
  className?: string;
}) {
  return (
    <IlustracaoMegafone
      className={`shrink-0 transition-opacity ${ativo ? 'animate-megafone-aviso opacity-95' : 'opacity-70'} ${className}`}
    />
  );
}
