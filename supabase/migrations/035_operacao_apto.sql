-- Aptidão operacional (novato → apto na função), decidida pelo líder — uso interno (bonificação).
alter table public.colaboradores
  add column if not exists operacao_apto boolean not null default false;

alter table public.colaboradores
  add column if not exists operacao_apto_em timestamptz;

alter table public.colaboradores
  add column if not exists operacao_apto_por uuid references public.colaboradores (id) on delete set null;

create index if not exists idx_colaboradores_operacao_apto on public.colaboradores (operacao_apto);

notify pgrst, 'reload schema';
