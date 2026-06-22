import { IlustracaoMegafone } from './PortalIlustracao';

/** Megafone com leve pulso e ondas quando há aviso ativo. */
export function MegafoneAnimado({
  ativo,
  className = 'w-20 h-16',
}: {
  ativo: boolean;
  className?: string;
}) {
  return (
    <span
      className={`relative inline-flex items-center justify-center shrink-0 ${className}`}
      aria-hidden
    >
      <IlustracaoMegafone
        className={`h-full w-full transition-opacity ${ativo ? 'animate-megafone-aviso opacity-100' : 'opacity-80'}`}
      />
      {ativo ? (
        <span className="pointer-events-none absolute -right-0.5 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_6px_rgba(34,197,94,0.7)]" />
      ) : null}
    </span>
  );
}
