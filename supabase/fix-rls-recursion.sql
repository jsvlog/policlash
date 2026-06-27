
-- Fix infinite recursion in RLS policies
-- Run this in Supabase SQL Editor

-- 1. Create is_admin() function (security definer = bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
$$;

-- 2. Drop the recursive policies
DROP POLICY IF EXISTS profiles_admin_all ON public.profiles;
DROP POLICY IF EXISTS cards_admin_write ON public.cards;
DROP POLICY IF EXISTS packs_admin_write ON public.shop_packs;
DROP POLICY IF EXISTS tx_admin_all ON public.transactions;
DROP POLICY IF EXISTS packs_admin_all ON public.user_packs;
DROP POLICY IF EXISTS ucards_admin_all ON public.user_cards;
DROP POLICY IF EXISTS receipts_admin_read ON storage.objects;

-- 3. Recreate policies using is_admin() function (no recursion)
CREATE POLICY profiles_admin_all ON public.profiles FOR ALL USING (public.is_admin());
CREATE POLICY cards_admin_write ON public.cards FOR ALL USING (public.is_admin());
CREATE POLICY packs_admin_write ON public.shop_packs FOR ALL USING (public.is_admin());
CREATE POLICY tx_admin_all ON public.transactions FOR ALL USING (public.is_admin());
CREATE POLICY packs_admin_all ON public.user_packs FOR ALL USING (public.is_admin());
CREATE POLICY ucards_admin_all ON public.user_cards FOR ALL USING (public.is_admin());
CREATE POLICY receipts_admin_read ON storage.objects FOR SELECT USING (bucket_id = 'receipts' AND public.is_admin());
