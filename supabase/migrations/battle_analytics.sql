-- ============================================================
-- Battle Analytics System
-- Run in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/crjhmqrctfsbbffnasqc/sql/new
-- ============================================================

CREATE TABLE IF NOT EXISTS public.battle_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  map_id INTEGER NOT NULL,
  stage_id INTEGER NOT NULL,
  result TEXT NOT NULL CHECK (result IN ('victory', 'defeat')),
  turns INTEGER NOT NULL DEFAULT 0,
  cards_used TEXT[] NOT NULL DEFAULT '{}',
  card_ids UUID[] NOT NULL DEFAULT '{}',
  monster_level INTEGER NOT NULL DEFAULT 1,
  monster_name TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.battle_logs ENABLE ROW LEVEL SECURITY;

-- Players can insert their own battle logs
CREATE POLICY "battle_logs_insert_own" ON public.battle_logs 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Players can read their own battle logs
CREATE POLICY "battle_logs_select_own" ON public.battle_logs 
  FOR SELECT USING (auth.uid() = user_id);

-- Admins can read all battle logs
CREATE POLICY "battle_logs_admin_all" ON public.battle_logs 
  FOR ALL USING (public.is_admin());

-- Index for analytics queries
CREATE INDEX IF NOT EXISTS idx_battle_logs_result ON public.battle_logs(result);
CREATE INDEX IF NOT EXISTS idx_battle_logs_map ON public.battle_logs(map_id, stage_id);
CREATE INDEX IF NOT EXISTS idx_battle_logs_created ON public.battle_logs(created_at);
