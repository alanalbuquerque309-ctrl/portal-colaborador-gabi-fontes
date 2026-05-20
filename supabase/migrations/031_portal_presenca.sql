-- Presença no portal: heartbeat por colaborador (último ping).
-- A API usa service role; aplique no SQL Editor do Supabase se não usar CLI de migrações.

create table if not exists public.portal_presenca (
  colaborador_id uuid primary key references public.colaboradores (id) on delete cascade,
  ultimo_ping_at timestamptz not null default now()
);

create index if not exists idx_portal_presenca_ultimo_ping_at on public.portal_presenca (ultimo_ping_at desc);

comment on table public.portal_presenca is
  'Último ping HTTP do portal por colaborador; usado para indicar quem está “online” (heurística, não tempo real absoluto).';
