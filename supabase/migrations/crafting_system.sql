-- ============================================================
-- Card Crafting System
-- Run in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/crjhmqrctfsbbffnasqc/sql/new
-- ============================================================

-- Add political capital to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS political_capital INTEGER NOT NULL DEFAULT 0;

-- Crafting log table
CREATE TABLE IF NOT EXISTS public.crafting_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('dismantle', 'craft')),
  card_id UUID REFERENCES public.cards(id),
  card_name TEXT NOT NULL,
  rarity TEXT NOT NULL,
  amount INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.crafting_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crafting_log_select_own" ON public.crafting_log FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "crafting_log_insert_own" ON public.crafting_log FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "crafting_log_admin_all" ON public.crafting_log FOR ALL USING (public.is_admin());
