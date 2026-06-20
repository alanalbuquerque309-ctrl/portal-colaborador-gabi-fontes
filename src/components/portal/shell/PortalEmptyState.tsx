type Props = {
  message: string;
  className?: string;
};

export function PortalEmptyState({ message, className = '' }: Props) {
  return (
    <p
      className={`text-sm text-cafeteria-600 rounded-xl border border-cafeteria-200/80 bg-cream-50/80 p-4 leading-relaxed ${className}`}
    >
      {message}
    </p>
  );
}
