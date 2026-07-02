-- ============================================================
-- Migration: Free Budget Pack for new signups
-- Run this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/crjhmqrctfsbbffnasqc/sql/new
-- ============================================================

-- Update handle_new_user() to give every new user 1 free Budget Pack
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  budget_pack_id TEXT;
BEGIN
  -- Create profile (existing behavior)
  INSERT INTO public.profiles (id, display_name)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'display_name', ''));
  
  -- Give free Budget Pack on signup
  SELECT id INTO budget_pack_id FROM public.shop_packs WHERE name = 'Budget Pack' LIMIT 1;
  IF budget_pack_id IS NOT NULL THEN
    INSERT INTO public.user_packs (user_id, pack_id, pack_name, status, obtained_at)
    VALUES (new.id, budget_pack_id, 'Budget Pack', 'unopened', NOW());
  END IF;
  
  RETURN new;
END;
$$;
