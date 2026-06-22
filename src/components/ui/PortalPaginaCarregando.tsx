import { XicaraCarregando } from '@/components/ui/XicaraCarregando';

type Props = {
  label?: string;
  /** 'page' centraliza com altura mínima; 'section' compacto para blocos */
  variant?: 'page' | 'section';
  className?: string;
};

/** Spinner padrão do portal (navegação + APIs pesadas). */
export function PortalPaginaCarregando({
  label = 'Carregando…',
  variant = 'page',
  className = '',
}: Props) {
  if (variant === 'section') {
    return (
      <div className={`flex justify-center py-8 ${className}`}>
        <XicaraCarregando size="sm" label={label} />
      </div>
    );
  }

  return (
    <div
      className={`flex justify-center items-center min-h-[42vh] py-16 md:py-24 ${className}`}
      aria-busy="true"
    >
      <XicaraCarregando size="lg" label={label} />
    </div>
  );
}
