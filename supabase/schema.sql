-- ============================================================
-- Giftly — Schema completo (idempotente: se puede re-ejecutar)
--
-- Uso en un proyecto NUEVO de Supabase:
--   1. Authentication > Sign In / Providers > habilitar "Allow anonymous sign-ins".
--   2. SQL Editor > New query > pegar este archivo completo > Run.
--
-- Modelo de acceso:
--   - El servidor (API routes) usa la service_role key: lee y escribe
--     saltando RLS, y valida permisos en código.
--   - El navegador solo usa la anon key para la sesión anónima y para
--     Realtime (votos, participantes y grupo en vivo). RLS limita esa
--     lectura a quien creó la búsqueda o participa del grupo.
-- ============================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- Tablas
-- ------------------------------------------------------------
create table if not exists public.gift_sessions (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid references auth.users not null,
  recipient_name text,
  recipient_relationship text,
  occasion text,
  occasion_date date,
  age_range text,
  budget_min integer,
  budget_max integer,
  interests text[] default '{}',
  recent_hints text,
  things_to_avoid text,
  additional_notes text,
  ai_source text,
  created_at timestamptz default now()
);

alter table public.gift_sessions add column if not exists ai_source text;

create table if not exists public.gift_options (
  id uuid primary key default gen_random_uuid(),
  gift_session_id uuid references public.gift_sessions on delete cascade,
  name text not null,
  category text,
  description text,
  why_it_fits text,
  compatibility_score integer check (compatibility_score between 0 and 100),
  estimated_price integer,
  currency text default 'ARS',
  image_url text,
  is_price_estimated boolean default true,
  product_url text,
  store_name text,
  pros text[] default '{}',
  cons text[] default '{}',
  gift_type text default 'physical',
  created_at timestamptz default now()
);

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  gift_session_id uuid references public.gift_sessions on delete cascade,
  name text not null default 'Mi grupo',
  creator_id uuid references auth.users,
  invite_code text unique,
  status text default 'active' check (status in ('active', 'finished')),
  winner_option_id uuid references public.gift_options on delete set null,
  created_at timestamptz default now()
);

create table if not exists public.group_participants (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references public.groups on delete cascade,
  user_id uuid references auth.users,
  display_name text not null,
  avatar text,
  joined_at timestamptz default now(),
  unique (group_id, user_id)
);

create table if not exists public.votes (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references public.groups on delete cascade,
  gift_option_id uuid references public.gift_options on delete cascade,
  participant_id uuid references public.group_participants on delete cascade,
  score integer check (score between 1 and 5),
  created_at timestamptz default now(),
  unique (gift_option_id, participant_id)
);

create index if not exists idx_gift_sessions_creator on public.gift_sessions (creator_id);
create index if not exists idx_gift_options_session on public.gift_options (gift_session_id);
create index if not exists idx_groups_session on public.groups (gift_session_id);
create index if not exists idx_groups_code on public.groups (invite_code);
create index if not exists idx_participants_group on public.group_participants (group_id);
create index if not exists idx_participants_user on public.group_participants (user_id);
create index if not exists idx_votes_group on public.votes (group_id);

-- ------------------------------------------------------------
-- Helper de membresía (security definer evita recursión de RLS
-- al consultar group_participants desde su propia política)
-- ------------------------------------------------------------
create or replace function public.is_group_member(gid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.group_participants
    where group_id = gid and user_id = auth.uid()
  ) or exists (
    select 1 from public.groups
    where id = gid and creator_id = auth.uid()
  );
$$;

create or replace function public.can_see_session(sid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.gift_sessions
    where id = sid and creator_id = auth.uid()
  ) or exists (
    select 1 from public.groups g
    where g.gift_session_id = sid and public.is_group_member(g.id)
  );
$$;

-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------
alter table public.gift_sessions enable row level security;
alter table public.gift_options enable row level security;
alter table public.groups enable row level security;
alter table public.group_participants enable row level security;
alter table public.votes enable row level security;

-- Limpieza de políticas de versiones anteriores
drop policy if exists "sesiones propias select" on public.gift_sessions;
drop policy if exists "sesiones: lectura amplia autenticados" on public.gift_sessions;
drop policy if exists "sesiones propias insert" on public.gift_sessions;
drop policy if exists "sesiones: insert solo dueño" on public.gift_sessions;
drop policy if exists "opciones: creador o participantes" on public.gift_options;
drop policy if exists "opciones: lectura amplia autenticados" on public.gift_options;
drop policy if exists "grupos: creador o participantes" on public.groups;
drop policy if exists "grupos: lectura amplia autenticados" on public.groups;
drop policy if exists "grupos: insertar con sesión propia" on public.groups;
drop policy if exists "grupos: insert solo dueño" on public.groups;
drop policy if exists "participantes: unirse" on public.group_participants;
drop policy if exists "participantes: insert solo dueño" on public.group_participants;
drop policy if exists "participantes: ver miembro del grupo" on public.group_participants;
drop policy if exists "participantes: lectura amplia autenticados" on public.group_participants;
drop policy if exists "votos: votar como participante" on public.votes;
drop policy if exists "votos: insert solo dueño" on public.votes;
drop policy if exists "votos: actualizar voto propio" on public.votes;
drop policy if exists "votos: update solo dueño" on public.votes;
drop policy if exists "votos: ver votos del grupo" on public.votes;
drop policy if exists "votos: lectura amplia autenticados" on public.votes;
drop policy if exists "sesiones: ver propias o de mis grupos" on public.gift_sessions;
drop policy if exists "opciones: ver de sesiones visibles" on public.gift_options;
drop policy if exists "grupos: ver si soy miembro" on public.groups;
drop policy if exists "participantes: ver de mis grupos" on public.group_participants;
drop policy if exists "votos: ver de mis grupos" on public.votes;

-- Lectura: solo quien creó la búsqueda o participa del grupo.
-- (Las pistas y "cosas a evitar" son datos personales: no se exponen
--  a cualquier usuario anónimo.)
create policy "sesiones: ver propias o de mis grupos" on public.gift_sessions
  for select using (public.can_see_session(id));

create policy "opciones: ver de sesiones visibles" on public.gift_options
  for select using (public.can_see_session(gift_session_id));

create policy "grupos: ver si soy miembro" on public.groups
  for select using (public.is_group_member(id));

create policy "participantes: ver de mis grupos" on public.group_participants
  for select using (public.is_group_member(group_id));

create policy "votos: ver de mis grupos" on public.votes
  for select using (public.is_group_member(group_id));

-- Escritura directa desde el navegador: bloqueada salvo el propio dueño.
-- (Hoy toda escritura pasa por las API routes con service_role.)
create policy "sesiones: insert solo dueño" on public.gift_sessions
  for insert with check (auth.uid() = creator_id);

create policy "grupos: insert solo dueño" on public.groups
  for insert with check (
    auth.uid() = creator_id
    and exists (
      select 1 from public.gift_sessions s
      where s.id = gift_session_id and s.creator_id = auth.uid()
    )
  );

create policy "participantes: insert solo dueño" on public.group_participants
  for insert with check (
    auth.uid() = user_id
    and exists (select 1 from public.groups g where g.id = group_id and g.status = 'active')
  );

create policy "votos: insert solo dueño" on public.votes
  for insert with check (
    exists (
      select 1 from public.group_participants p
      where p.id = participant_id
        and p.user_id = auth.uid()
        and p.group_id = votes.group_id
    )
  );

create policy "votos: update solo dueño" on public.votes
  for update using (
    exists (
      select 1 from public.group_participants p
      where p.id = participant_id and p.user_id = auth.uid()
    )
  );

-- ------------------------------------------------------------
-- Realtime: ranking en vivo (cada tabla con su propio guard)
-- ------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['votes', 'groups', 'group_participants'] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then
      raise notice '% ya está en supabase_realtime', t;
    end;
  end loop;
end $$;

select 'Giftly: schema aplicado' as status;
