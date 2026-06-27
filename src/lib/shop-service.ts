// ============================================================
// PoliClash PH — Supabase Service Layer
// ============================================================
// USER-FACING functions use the browser client (RLS-protected).
// ADMIN functions go through /api/admin/* server routes (service-role key).
// ============================================================
import { createClient } from '@/lib/supabase/client'

// ---- Browser client (RLS-protected, user context) ----
function getBrowserClient() {
  return createClient()
}

// ---- Fetch user's own transactions (RLS: user sees only own) ----
export async function fetchMyTransactions() {
  const supabase = getBrowserClient()
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.warn('fetchMyTransactions error:', error.message)
    return []
  }
  return data || []
}

// ---- Fetch user's packs (RLS: user sees only own packs) ----
export async function fetchUserPacks(userId: string) {
  const supabase = getBrowserClient()
  const { data, error } = await supabase
    .from('user_packs')
    .select('*')
    .eq('user_id', userId)
    .order('obtained_at', { ascending: false })

  if (error) {
    console.warn('fetchUserPacks error:', error.message)
    return []
  }
  return data || []
}

// ---- Fetch user's cards (RLS: user sees only own cards) ----
export async function fetchUserCards(userId: string) {
  const supabase = getBrowserClient()
  const { data, error } = await supabase
    .from('user_cards')
    .select('*')
    .eq('user_id', userId)
    .order('obtained_at', { ascending: false })

  if (error) {
    console.warn('fetchUserCards error:', error.message)
    return []
  }
  return data || []
}

// ---- Upload receipt to Supabase Storage (user uploads to own folder) ----
export async function uploadReceipt(
  userId: string,
  file: File,
  referenceNumber: string
): Promise<string> {
  const supabase = getBrowserClient()
  const ext = file.name.split('.').pop() || 'jpg'
  const path = `${userId}/${referenceNumber}.${ext}`

  const { error } = await supabase.storage
    .from('receipts')
    .upload(path, file, { upsert: true })

  if (error) throw error

  const { data } = supabase.storage
    .from('receipts')
    .getPublicUrl(path)

  return data.publicUrl
}

// ---- Create a transaction record (RLS: user inserts own row) ----
export async function createTransaction(params: {
  reference_number: string
  user_id: string
  amount: number
  pack_id: string
  receipt_url: string
}) {
  const supabase = getBrowserClient()
  const { error } = await supabase
    .from('transactions')
    .insert({
      reference_number: params.reference_number,
      user_id: params.user_id,
      amount: params.amount,
      pack_id: params.pack_id,
      receipt_url: params.receipt_url,
      status: 'pending',
    })

  if (error) throw error
  return true
}

// ---- Check if current user is admin (RLS: user reads own profile) ----
export async function checkIsAdmin(userId: string): Promise<boolean> {
  const supabase = getBrowserClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', userId)
    .single()

  if (error || !data) return false
  return data.is_admin === true
}

// ============================================================
// ADMIN functions — call server-side API routes
// (service-role key is only available on the server)
// ============================================================

// ---- Fetch all pending transactions (admin only) ----
export async function fetchPendingTransactions() {
  const res = await fetch('/api/admin/transactions')
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to fetch transactions')
  }
  const data = await res.json()
  return data.transactions || []
}

// ---- Approve transaction via RPC (admin only) ----
export async function approveTransaction(referenceNumber: string) {
  const res = await fetch('/api/admin/approve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ referenceNumber }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to approve transaction')
  }
  return true
}

// ---- Reject transaction via RPC (admin only) ----
export async function rejectTransaction(referenceNumber: string) {
  const res = await fetch('/api/admin/reject', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ referenceNumber }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to reject transaction')
  }
  return true
}