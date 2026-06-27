import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

// GET — list all users (admin only)
export async function GET() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = getAdminClient()

  // Get profiles
  const { data: profiles, error: profilesErr } = await admin
    .from('profiles')
    .select('id, display_name, created_at')
    .order('created_at', { ascending: false })

  if (profilesErr) return NextResponse.json({ error: profilesErr.message }, { status: 500 })

  // Get auth emails using admin API
  const { data: authUsers, error: authErr } = await admin.auth.admin.listUsers()
  
  const emailMap: Record<string, string> = {}
  if (!authErr && authUsers) {
    for (const au of authUsers.users) {
      emailMap[au.id] = au.email || ''
    }
  }

  const users = profiles.map((p: any) => ({
    id: p.id,
    display_name: p.display_name || '',
    email: emailMap[p.id] || '',
    created_at: p.created_at,
  }))

  return NextResponse.json({ users })
}
