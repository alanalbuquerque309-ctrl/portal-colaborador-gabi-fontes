import { linhaAutorElogio, type AutorElogioFeed } from '@/lib/elogios-vigencia';

type Props = AutorElogioFeed & {
  className?: string;
};

/** Nome · setor · unidade (ou Anônimo). */
export function LinhaAutorElogio({ className, ...item }: Props) {
  return <span className={className}>{linhaAutorElogio(item)}</span>;
}
