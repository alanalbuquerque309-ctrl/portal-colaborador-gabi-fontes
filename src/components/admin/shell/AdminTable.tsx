import type { ReactNode } from 'react';

type TableProps = {
  children: ReactNode;
  className?: string;
};

export function AdminTable({ children, className = '' }: TableProps) {
  return (
    <div className={`overflow-x-auto -mx-1 ${className}`}>
      <table className="w-full min-w-[480px] text-sm text-left border-collapse">{children}</table>
    </div>
  );
}

export function AdminTableHead({ children }: { children: ReactNode }) {
  return (
    <thead>
      <tr className="border-b border-cafeteria-200 text-xs uppercase tracking-wide text-cafeteria-600">
        {children}
      </tr>
    </thead>
  );
}

export function AdminTableTh({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <th className={`py-2.5 px-3 font-semibold first:pl-0 last:pr-0 ${className}`}>{children}</th>;
}

export function AdminTableBody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-cafeteria-100">{children}</tbody>;
}

export function AdminTableRow({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <tr className={`hover:bg-cream-50/80 ${className}`}>{children}</tr>;
}

export function AdminTableTd({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <td className={`py-3 px-3 align-middle first:pl-0 last:pr-0 text-cafeteria-900 ${className}`}>{children}</td>;
}
