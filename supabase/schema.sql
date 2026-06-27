-- ============================================================
--  PoliClash PH — Supabase Schema & Migrations
--  Run this entire file in the Supabase SQL Editor.
-- ============================================================

-- extensions
create extension if not exists "pgcrypto";

-- ============================================================
--  1. PROFILES (extends auth.users)
-- ============================================================
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  display_name text default '',
  is_admin    boolean not null default false,
  created_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Security definer function to check admin status WITHOUT triggering RLS recursion.
create or replace function public.is_admin()
returns boolean language sql security definer stable as $$
  select coalesce(
    (select is_admin from public.profiles where id = auth.uid()),
    false
  )
$$;

create policy "profiles_select_own"  on public.profiles for select using (auth.uid() = id);
create policy "profiles_insert_own"  on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own"  on public.profiles for update using (auth.uid() = id);
create policy "profiles_admin_all"   on public.profiles for all using (public.is_admin());

-- auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', ''));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
--  2. CARDS (master card library)
-- ============================================================
create table if not exists public.cards (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  title         text not null default '',
  faction       text not null check (faction in ('trapo','reformer','showbiz','dynasty','activist','warlord')),
  rarity        text not null check (rarity in ('common','rare','epic','legendary','mythic')),
  stats         jsonb not null default '{"charisma":5,"machinery":5,"budget":5,"influence":5}',
  ability       jsonb,
  art_url       text default '',
  flavor_text   text default '',
  cost          integer not null default 3 check (cost between 1 and 10),
  pack_source   text default 'starter'
);

alter table public.cards enable row level security;

create policy "cards_public_read" on public.cards for select using (true);
create policy "cards_admin_write" on public.cards for all using (
  public.is_admin()
);

-- ============================================================
--  3. SHOP PACKS (premium pack definitions)
-- ============================================================
create table if not exists public.shop_packs (
  id                text primary key,
  name              text not null,
  description       text default '',
  price             numeric not null default 50,
  card_count        integer not null default 5,
  guaranteed_rarity text not null default 'rare',
  rarity_weights     jsonb not null default '{"common":60,"rare":25,"epic":10,"mythic":4,"legendary":1}',
  art_url           text default '',
  featured_cards    text[] default '{}'
);

alter table public.shop_packs enable row level security;

create policy "packs_public_read" on public.shop_packs for select using (true);
create policy "packs_admin_write" on public.shop_packs for all using (
  public.is_admin()
);

-- ============================================================
--  4. TRANSACTIONS (GCash receipt queue)
-- ============================================================
create table if not exists public.transactions (
  reference_number text primary key,
  user_id          uuid references auth.users(id) on delete cascade not null,
  amount           numeric not null,
  pack_id          text not null default '',
  receipt_url      text default '',
  status           text not null default 'pending'
                   check (status in ('pending','approved','rejected')),
  created_at       timestamptz not null default now(),
  reviewed_at      timestamptz,
  reviewed_by      uuid references auth.users(id)
);

alter table public.transactions enable row level security;

create policy "tx_select_own" on public.transactions
  for select using (auth.uid() = user_id);
create policy "tx_insert_own" on public.transactions
  for insert with check (auth.uid() = user_id);
create policy "tx_update_own" on public.transactions
  for update using (auth.uid() = user_id);

create policy "tx_admin_all" on public.transactions
  for all using (
    public.is_admin()
  );

-- ============================================================
--  5. USER PACKS (pack inventory — awarded on approval)
-- ============================================================
create table if not exists public.user_packs (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users(id) on delete cascade not null,
  pack_id         text not null default '',
  pack_name       text not null default '',
  status          text not null default 'unopened' check (status in ('unopened','opened')),
  obtained_at     timestamptz not null default now(),
  transaction_ref text
);

alter table public.user_packs enable row level security;

create policy "packs_select_own" on public.user_packs for select using (auth.uid() = user_id);
create policy "packs_insert_own" on public.user_packs for insert with check (auth.uid() = user_id);
create policy "packs_update_own" on public.user_packs for update using (auth.uid() = user_id);
create policy "packs_admin_all"  on public.user_packs for all using (
  public.is_admin()
);

-- ============================================================
--  6. USER CARDS (individual card inventory)
-- ============================================================
create table if not exists public.user_cards (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete cascade not null,
  card_id      uuid references public.cards(id),
  card_name    text default '',
  level        integer not null default 1 check (level between 1 and 100),
  xp           integer not null default 0,
  obtained_at  timestamptz not null default now(),
  pack_id      text
);

alter table public.user_cards enable row level security;

create policy "ucards_select_own" on public.user_cards for select using (auth.uid() = user_id);
create policy "ucards_insert_own" on public.user_cards for insert with check (auth.uid() = user_id);
create policy "ucards_admin_all"  on public.user_cards for all using (
  public.is_admin()
);

-- ============================================================
--  7. ADMIN RPC: approve_transaction
-- ============================================================
create or replace function public.approve_transaction(
  p_ref text
) returns void language plpgsql security definer as $$
declare
  v_tx    public.transactions%rowtype;
  v_pack  public.shop_packs%rowtype;
begin
  select * into v_tx from public.transactions where reference_number = p_ref;
  if not found then raise exception 'Transaction not found'; end if;
  if v_tx.status <> 'pending' then raise exception 'Transaction already processed'; end if;

  update public.transactions
     set status = 'approved', reviewed_at = now(), reviewed_by = auth.uid()
   where reference_number = p_ref;

  select * into v_pack from public.shop_packs where id = v_tx.pack_id;
  if found then
    insert into public.user_packs (user_id, pack_id, pack_name, status, transaction_ref)
    values (v_tx.user_id, v_tx.pack_id, v_pack.name, 'unopened', p_ref);
  else
    insert into public.user_packs (user_id, pack_name, status, transaction_ref)
    values (v_tx.user_id, 'Mystery Pack', 'unopened', p_ref);
  end if;
end;
$$;

-- ============================================================
--  8. ADMIN RPC: reject_transaction
-- ============================================================
create or replace function public.reject_transaction(
  p_ref text
) returns void language plpgsql security definer as $$
begin
  update public.transactions
     set status = 'rejected', reviewed_at = now(), reviewed_by = auth.uid()
   where reference_number = p_ref and status = 'pending';
end;
$$;

-- ============================================================
--  9. STORAGE BUCKET for GCash receipts
-- ============================================================
insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', true)
on conflict (id) do update set public = true;

insert into storage.buckets (id, name, public)
values ('card-art', 'card-art', true)
on conflict (id) do update set public = true;

-- Card art: admins can upload, everyone can read
create policy "cardart_admin_upload" on storage.objects
  for insert with check (
    bucket_id = 'card-art' and public.is_admin()
  );
create policy "cardart_public_read" on storage.objects
  for select using (bucket_id = 'card-art');

create policy "receipts_upload_own" on storage.objects
  for insert with check (
    bucket_id = 'receipts' and
    (auth.uid()::text = (storage.foldername(name))[1])
  );

create policy "receipts_read_own" on storage.objects
  for select using (
    bucket_id = 'receipts' and
    (auth.uid()::text = (storage.foldername(name))[1])
  );

create policy "receipts_admin_read" on storage.objects
  for select using (
    bucket_id = 'receipts' and
    public.is_admin()
  );

-- ============================================================
-- 10. SEED DATA — Parody Cards
-- ============================================================
insert into public.cards (name, title, faction, rarity, stats, ability, cost, pack_source, flavor_text)
values
  ('Mayor Budots', 'Mayor of Talisay', 'trapo', 'common',
   '{"charisma":6,"machinery":4,"budget":7,"influence":2}',
   '{"id":"vote_buy","name":"Vote Buying","type":"vote_buy","description":"Add +1 to all stats this turn.","power":1,"cooldown":2,"trigger":"active"}',
   4, 'starter', 'Every vote has a price tag.'),
  ('Senador Grandstander', 'Senator-At-Large', 'trapo', 'rare',
   '{"charisma":8,"machinery":6,"budget":5,"influence":3}',
   '{"id":"privilege_speech","name":"Privilege Speech","type":"break_defense","description":"Break enemy defenses — next attack ignores defense stats.","power":0,"cooldown":3,"trigger":"active"}',
   5, 'starter', 'Insert privilege speech here.'),
  ('Kongresista Dynasty III', 'Representative 3rd District', 'dynasty', 'epic',
   '{"charisma":5,"machinery":9,"budget":6,"influence":4}',
   '{"id":"legacy","name":"Family Legacy","type":"legacy","description":"When destroyed, adjacent allies gain +2 Influence.","power":2,"cooldown":0,"trigger":"on_destroy"}',
   6, 'starter', 'My father was congressman. His father was congressman. I am congressman.'),
  ('Governor Warlord', 'Provincial Governor', 'warlord', 'epic',
   '{"charisma":4,"machinery":7,"budget":8,"influence":7}',
   '{"id":"blackmail","name":"Blackmail","type":"blackmail","description":"Destroy enemy card with lowest Influence.","power":1,"cooldown":3,"trigger":"active"}',
   7, 'mythic-trapo', 'Peace and order... my way.'),
  ('Prezidensiable Showbiz', 'Presidential Candidate', 'showbiz', 'mythic',
   '{"charisma":10,"machinery":5,"budget":7,"influence":5}',
   '{"id":"rally_support","name":"Mega Campaign Rally","type":"rally_support","description":"+3 Charisma to all allies on board.","power":3,"cooldown":2,"trigger":"active"}',
   8, 'mythic-trapo', 'From noontime show to noontime inauguration.'),
  ('Konsehala Activista', 'City Councilor', 'activist', 'rare',
   '{"charisma":6,"machinery":3,"budget":3,"influence":4}',
   '{"id":"investigate","name":"Investigate","type":"investigate","description":"Reveal all enemy face-down cards.","power":0,"cooldown":2,"trigger":"active"}',
   3, 'starter', 'Fighting the good fight since 1998.'),
  ('Barangay Captain Trapo', 'Barangay Captain', 'trapo', 'common',
   '{"charisma":4,"machinery":3,"budget":4,"influence":1}',
   null, 2, 'starter', 'Small-time corruption, small-time dreams.'),
  ('Bise Presidente Reformist', 'Vice President', 'reformer', 'epic',
   '{"charisma":7,"machinery":4,"budget":5,"influence":2}',
   '{"id":"pardon","name":"Executive Pardon","type":"pardon","description":"Revive a destroyed ally from graveyard.","power":1,"cooldown":4,"trigger":"active"}',
   6, 'reformer-pack', 'Change is coming... eventually.'),
  ('Lobbyista Hidden', 'Chief of Staff', 'trapo', 'rare',
   '{"charisma":3,"machinery":7,"budget":9,"influence":3}',
   '{"id":"pork_barrel","name":"Pork Barrel","type":"pork_barrel","description":"Generate +3 Budget pool immediately.","power":3,"cooldown":2,"trigger":"on_play"}',
   4, 'mythic-trapo', 'Where there''s a project, there''s a kickback.'),
  ('Probinsiyano Strongman', 'Mayor of disthan town', 'warlord', 'legendary',
   '{"charisma":7,"machinery":10,"budget":9,"influence":8}',
   '{"id":"immunity","name":"Political Immunity","type":"immunity","description":"Cannot be targeted for 2 turns.","power":2,"cooldown":3,"trigger":"active"}',
   9, 'mythic-trapo', 'Untouchable. Untraceable. Unfortunately real.')
on conflict (id) do nothing;

-- ============================================================
-- 11. SEED DATA — Shop Packs
-- ============================================================
insert into public.shop_packs (id, name, description, price, card_count, guaranteed_rarity, rarity_weights, featured_cards)
values
  ('starter-trapo-pack', 'Starter Trapo Pack', 'Signed in by the barangay captain himself. 5 cards, at least 1 Rare.', 25, 5, 'rare',
   '{"common":60,"rare":25,"epic":10,"legendary":4,"mythic":1}',
   ARRAY['Mayor Budots','Konsehala Activista']),
  ('mythic-trapo-pack', 'Mythic Trapo Pack', 'Where the real trapos play. 5 cards, guaranteed Epic or higher. Chance for Mythic and Legendary!', 50, 5, 'epic',
   '{"common":30,"rare":30,"epic":25,"legendary":10,"mythic":5}',
   ARRAY['Prezidensiable Showbiz','Lobbyista Hidden']),
  ('reformers-pack', 'Reformer''s Dilemma Pack', 'A pack for the idealists. 5 cards featuring the rare Reformist faction.', 40, 5, 'rare',
   '{"common":50,"rare":30,"epic":15,"legendary":4,"mythic":1}',
   ARRAY['Bise Presidente Reformist']),
  ('legendary-dynasty', 'Legendary Dynasty Pack', 'Blood is thicker than water — and politics. 3 cards, with a shot at the one and only Legendary card.', 100, 3, 'legendary',
   '{"common":10,"rare":20,"epic":30,"legendary":25,"mythic":15}',
   ARRAY['Probinsiyano Strongman','Kongresista Dynasty III'])
on conflict (id) do nothing;

-- ============================================================
-- 12. CAMPAIGN PROGRESS (tracks player's campaign completion)
-- ============================================================
create table if not exists public.campaign_progress (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete cascade not null,
  map_id       integer not null,
  stage_id     integer not null check (stage_id between 1 and 10),
  completed    boolean not null default false,
  stars        integer not null default 1 check (stars between 1 and 3),
  completed_at timestamptz default now(),
  unique (user_id, map_id, stage_id)
);

alter table public.campaign_progress enable row level security;

create policy "cprog_select_own" on public.campaign_progress for select using (auth.uid() = user_id);
create policy "cprog_insert_own" on public.campaign_progress for insert with check (auth.uid() = user_id);
create policy "cprog_update_own" on public.campaign_progress for update using (auth.uid() = user_id);
create policy "cprog_admin_all"  on public.campaign_progress for all using (public.is_admin());
