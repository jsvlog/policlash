import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

// Admin client with service-role key (server-only, bypasses RLS)
function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export async function GET() {
  // Verify the requester is authenticated and is an admin
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check admin status
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) {
    return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 })
  }

  // Fetch pending transactions with user email
  const admin = getAdminClient()
  const { data: transactions, error } = await admin
    .from('transactions')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Fetch user emails separately (auth.users is not readable via REST)
  const userIds = [...new Set(transactions?.map((t: any) => t.user_id) || [])]
  let userEmails: Record<string, string> = {}
  if (userIds.length > 0) {
    const { data: users } = await admin.auth.admin.listUsers()
    userEmails = Object.fromEntries(
      (users?.users || []).map((u: any) => [u.id, u.email || 'Unknown'])
    )
  }

  const enriched = (transactions || []).map((t: any) => ({
    ...t,
    user_email: userEmails[t.user_id] || 'Unknown',
  }))

  return NextResponse.json({ transactions: enriched })
}