-- ============================================================
-- Axei — Etapa 2.6 — schema de dados (PostgreSQL + RLS + Storage)
-- Cole no SQL Editor do projeto Supabase e clique em "Run".
-- Idempotente: pode ser executado mais de uma vez.
-- ============================================================

-- Tabela de cartões (verso embutido como JSONB)
create table if not exists public.cards (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null default '',
  favorite boolean not null default false,
  background_seed integer not null default 0,
  front text not null default '',
  back jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists cards_user_updated_at_idx
  on public.cards (user_id, updated_at desc);

-- RLS: cada usuário só vê/edita/apaga os próprios cartões
alter table public.cards enable row level security;

drop policy if exists "cards_select_own" on public.cards;
create policy "cards_select_own" on public.cards
  for select using (auth.uid() = user_id);

drop policy if exists "cards_insert_own" on public.cards;
create policy "cards_insert_own" on public.cards
  for insert with check (auth.uid() = user_id);

drop policy if exists "cards_update_own" on public.cards;
create policy "cards_update_own" on public.cards
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "cards_delete_own" on public.cards;
create policy "cards_delete_own" on public.cards
  for delete using (auth.uid() = user_id);

-- updated_at automático a cada update
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists cards_set_updated_at on public.cards;
create trigger cards_set_updated_at
  before update on public.cards
  for each row
  execute function public.set_updated_at();

-- Bucket privado para fotos e áudios dos cartões
insert into storage.buckets (id, name, public)
values ('card-media', 'card-media', false)
on conflict (id) do nothing;

drop policy if exists "card_media_select_own" on storage.objects;
create policy "card_media_select_own" on storage.objects
  for select using (
    bucket_id = 'card-media'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "card_media_insert_own" on storage.objects;
create policy "card_media_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'card-media'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "card_media_delete_own" on storage.objects;
create policy "card_media_delete_own" on storage.objects
  for delete using (
    bucket_id = 'card-media'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
