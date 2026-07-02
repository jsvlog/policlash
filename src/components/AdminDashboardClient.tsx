'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { fetchPendingTransactions, approveTransaction, rejectTransaction, checkIsAdmin } from '@/lib/shop-service'
import { RARITY_COLORS, FACTION_COLORS, FACTION_ICONS } from '@/lib/card-data'
import MetaTab from '@/components/MetaTab'
import EconomyTab from '@/components/EconomyTab'
import type { CardRarity, CardFaction } from '@/lib/types'

type Tab = 'transactions' | 'cards' | 'meta' | 'economy'

const RARITY_OPTIONS: CardRarity[] = ['common', 'rare', 'epic', 'mythic', 'legendary']
const FACTION_OPTIONS: CardFaction[] = ['trapo', 'reformer', 'showbiz', 'dynasty', 'activist', 'warlord']
const STAT_KEYS = ['charisma', 'machinery', 'budget', 'influence'] as const

export default function AdminDashboardClient() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [transactions, setTransactions] = useState<any[]>([])
  const [cards, setCards] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('transactions')
  const [editingCard, setEditingCard] = useState<any | null>(null)
  const [editForm, setEditForm] = useState<Record<string, any>>({})
  const [saving, setSaving] = useState(false)
  const [addingCard, setAddingCard] = useState(false)
  const [editImageFile, setEditImageFile] = useState<File | null>(null)
  const [editImagePreview, setEditImagePreview] = useState<string>('')
  const [addImageFile, setAddImageFile] = useState<File | null>(null)
  const [addImagePreview, setAddImagePreview] = useState<string>('')
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  // Give cards
  const [giveCardUserId, setGiveCardUserId] = useState('')
  const [giveCardCardId, setGiveCardCardId] = useState('')
  const [users, setUsers] = useState<any[]>([])
  const [givingCard, setGivingCard] = useState(false)
  const [giveCardResult, setGiveCardResult] = useState<string>('')
  // Card library sorting/filtering
  const [cardSortBy, setCardSortBy] = useState<'name' | 'rarity' | 'faction' | 'cost'>('rarity')
  const [cardFilterRarity, setCardFilterRarity] = useState<string>('all')
  const [cardFilterFaction, setCardFilterFaction] = useState<string>('all')
  const [addForm, setAddForm] = useState<Record<string, any>>({
    name: '', title: '', faction: 'trapo', rarity: 'common', cost: 3,
    pack_source: 'custom', flavor_text: '',
    charisma: 5, machinery: 5, budget: 5, influence: 5,
    ability_name: '', ability_desc: '', ability_type: '', ability_power: 0, ability_cooldown: 0, ability_trigger: 'active',
  })
  const router = useRouter()

  const loadTransactions = async () => {
    try {
      const txs = await fetchPendingTransactions()
      setTransactions(txs)
    } catch (err) { console.error('Failed to load transactions:', err) }
  }

  const loadCards = async () => {
    try {
      const res = await fetch('/api/admin/cards')
      if (res.ok) {
        const data = await res.json()
        setCards(data.cards || [])
      }
    } catch (err) { console.error('Failed to load cards:', err) }
  }

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push('/login'); return }
      const admin = await checkIsAdmin(data.user.id)
      if (!admin) { setIsAdmin(false); setLoading(false); return }
      setIsAdmin(true)
      await Promise.all([loadTransactions(), loadCards()])
      setLoading(false)
    })
  }, [router])

  const handleApprove = async (ref: string) => {
    setProcessing(ref)
    try {
      await approveTransaction(ref)
      setTransactions((prev) => prev.filter((t) => t.reference_number !== ref))
    } catch (err: any) { alert(`Failed: ${err.message}`) }
    setProcessing(null)
  }

  const handleReject = async (ref: string) => {
    setProcessing(ref)
    try {
      await rejectTransaction(ref)
      setTransactions((prev) => prev.filter((t) => t.reference_number !== ref))
    } catch (err: any) { alert(`Failed: ${err.message}`) }
    setProcessing(null)
  }

  const openEditCard = (card: any) => {
    setEditingCard(card)
    setEditImageFile(null)
    setEditImagePreview(card.art_url || '')
    setEditForm({
      name: card.name || '',
      title: card.title || '',
      faction: card.faction || 'trapo',
      rarity: card.rarity || 'common',
      cost: card.cost || 3,
      flavor_text: card.flavor_text || '',
      pack_source: card.pack_source || 'starter',
      charisma: card.stats?.charisma || 5,
      machinery: card.stats?.machinery || 5,
      budget: card.stats?.budget || 5,
      influence: card.stats?.influence || 5,
      ability_name: card.ability?.name || '',
      ability_desc: card.ability?.description || '',
      ability_type: card.ability?.type || '',
      ability_power: card.ability?.power || 0,
      ability_cooldown: card.ability?.cooldown || 0,
      ability_trigger: card.ability?.trigger || 'active',
    })
  }

  const uploadImage = async (file: File): Promise<string | null> => {
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/admin/upload', { method: 'POST', body: formData })
      if (!res.ok) {
        const err = await res.json()
        alert('Image upload failed: ' + (err.error || 'Unknown'))
        return null
      }
      const data = await res.json()
      return data.url
    } catch (err: any) { alert('Upload error: ' + err.message); return null }
    finally { setUploading(false) }
  }

  const saveCard = async () => {
    if (!editingCard) return
    setSaving(true)
    try {
      // Upload image if new file selected
      let artUrl = editingCard.art_url || ''
      if (editImageFile) {
        const url = await uploadImage(editImageFile)
        if (!url) { setSaving(false); return }
        artUrl = url
      }
      const stats = {
        charisma: Number(editForm.charisma),
        machinery: Number(editForm.machinery),
        budget: Number(editForm.budget),
        influence: Number(editForm.influence),
      }
      const hasAbility = editForm.ability_name.trim()
      const ability = hasAbility ? {
        id: editingCard.ability?.id || editForm.ability_name.toLowerCase().replace(/\s+/g, '_'),
        name: editForm.ability_name,
        description: editForm.ability_desc,
        type: editForm.ability_type,
        power: Number(editForm.ability_power),
        cooldown: Number(editForm.ability_cooldown),
        trigger: editForm.ability_trigger,
      } : null

      const res = await fetch('/api/admin/cards', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingCard.id,
          name: editForm.name,
          title: editForm.title,
          faction: editForm.faction,
          rarity: editForm.rarity,
          cost: Number(editForm.cost),
          flavor_text: editForm.flavor_text,
          pack_source: editForm.pack_source,
          art_url: artUrl,
          stats,
          ability,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        alert('Failed: ' + (err.error || 'Unknown error'))
        return
      }
      setEditingCard(null)
      await loadCards()
    } catch (err: any) { alert('Error: ' + err.message) }
    setSaving(false)
  }

  const createCard = async () => {
    setSaving(true)
    try {
      // Upload image if selected
      let artUrl = ''
      if (addImageFile) {
        const url = await uploadImage(addImageFile)
        if (!url) { setSaving(false); return }
        artUrl = url
      }
      const stats = {
        charisma: Number(addForm.charisma),
        machinery: Number(addForm.machinery),
        budget: Number(addForm.budget),
        influence: Number(addForm.influence),
      }
      const hasAbility = addForm.ability_name.trim()
      const ability = hasAbility ? {
        id: addForm.ability_name.toLowerCase().replace(/\s+/g, '_'),
        name: addForm.ability_name,
        description: addForm.ability_desc,
        type: addForm.ability_type,
        power: Number(addForm.ability_power),
        cooldown: Number(addForm.ability_cooldown),
        trigger: addForm.ability_trigger,
      } : null

      const res = await fetch('/api/admin/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: addForm.name,
          title: addForm.title,
          faction: addForm.faction,
          rarity: addForm.rarity,
          cost: Number(addForm.cost),
          pack_source: addForm.pack_source,
          flavor_text: addForm.flavor_text,
          art_url: artUrl,
          stats,
          ability,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        alert('Failed: ' + (err.error || 'Unknown error'))
        return
      }
      setAddingCard(false)
      // Reset form
      setAddForm({
        name: '', title: '', faction: 'trapo', rarity: 'common', cost: 3,
        pack_source: 'custom', flavor_text: '',
        charisma: 5, machinery: 5, budget: 5, influence: 5,
        ability_name: '', ability_desc: '', ability_type: '', ability_power: 0, ability_cooldown: 0, ability_trigger: 'active',
      })
      await loadCards()
    } catch (err: any) { alert('Error: ' + err.message) }
    setSaving(false)
  }

  const handleDeleteCard = async (cardId: string, cardName: string) => {
    if (!confirm(`Delete "${cardName}"?\n\nThis will permanently remove this card AND all player copies of it. This cannot be undone.`)) {
      return
    }
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/cards?id=${encodeURIComponent(cardId)}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json()
        alert('Delete failed: ' + (err.error || 'Unknown error'))
        return
      }
      setEditingCard(null)
      await loadCards()
    } catch (err: any) { alert('Error: ' + err.message) }
    setDeleting(false)
  }

  const loadUsers = async () => {
    try {
      const res = await fetch('/api/admin/users')
      if (res.ok) {
        const data = await res.json()
        setUsers(data.users || [])
      }
    } catch (err) { console.error('Failed to load users:', err) }
  }

  const giveCardToUser = async () => {
    if (!giveCardUserId || !giveCardCardId) {
      alert('Select a user and a card first')
      return
    }
    setGivingCard(true)
    setGiveCardResult('')
    try {
      const res = await fetch('/api/admin/give-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: giveCardUserId, card_id: giveCardCardId }),
      })
      const data = await res.json()
      if (!res.ok) {
        alert('Failed: ' + (data.error || 'Unknown error'))
        return
      }
      setGiveCardResult(`✓ Gave "${data.card_name}" (${data.rarity}) to user!`)
    } catch (err: any) { alert('Error: ' + err.message) }
    setGivingCard(false)
  }

  // Not admin
  if (isAdmin === false) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <div className="text-5xl mb-4">🚫</div>
        <h1 className="text-2xl font-bold text-rose-400 mb-2">Access Denied</h1>
        <p className="text-white/50 mb-6">You do not have admin privileges.</p>
        <a href="/dashboard" className="px-6 py-2 rounded-lg btn-gradient text-white font-medium inline-block">
          Back to Dashboard
        </a>
      </div>
    )
  }

  if (loading || isAdmin === null) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20">
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="glass-card p-6 animate-pulse">
              <div className="h-6 w-48 bg-white/10 rounded-lg mb-4" />
              <div className="h-4 w-full bg-white/5 rounded-md" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold gradient-text">🔐 Admin Dashboard</h1>
        <button
          onClick={() => { loadTransactions(); loadCards() }}
          className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white text-sm font-medium transition"
        >
          🔄 Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-8">
        <button
          onClick={() => setTab('transactions')}
          className={`px-5 py-2.5 rounded-xl text-sm font-medium transition ${
            tab === 'transactions'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              : 'bg-white/5 text-white/50 hover:bg-white/10 border border-white/5'
          }`}
        >
          💰 Transactions {transactions.length > 0 && `(${transactions.length})`}
        </button>
        <button
          onClick={() => { setTab('cards'); loadUsers() }}
          className={`px-5 py-2.5 rounded-xl text-sm font-medium transition ${
            tab === 'cards'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              : 'bg-white/5 text-white/50 hover:bg-white/10 border border-white/5'
          }`}
        >
          🎴 Card Library ({cards.length})
        </button>
        <button
          onClick={() => setTab('meta')}
          className={`px-5 py-2.5 rounded-xl text-sm font-medium transition ${
            tab === 'meta'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              : 'bg-white/5 text-white/50 hover:bg-white/10 border border-white/5'
          }`}
        >
          🎮 Meta
        </button>
        <button
          onClick={() => setTab('economy')}
          className={`px-5 py-2.5 rounded-xl text-sm font-medium transition ${
            tab === 'economy'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              : 'bg-white/5 text-white/50 hover:bg-white/10 border border-white/5'
          }`}
        >
          📊 Economy
        </button>
      </div>

      {/* TRANSACTIONS TAB */}
      {tab === 'transactions' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="glass-card p-6">
              <div className="text-4xl font-bold text-amber-400">{transactions.length}</div>
              <div className="text-sm text-white/50 mt-1">Pending</div>
            </div>
            <div className="glass-card p-6">
              <div className="text-4xl font-bold text-green-400">
                ₱{transactions.reduce((s, t) => s + (parseFloat(t.amount) || 0), 0).toFixed(2)}
              </div>
              <div className="text-sm text-white/50 mt-1">Total Value</div>
            </div>
            <div className="glass-card p-6">
              <div className="text-4xl font-bold text-rose-400">
                {new Set(transactions.map((t) => t.user_id)).size}
              </div>
              <div className="text-sm text-white/50 mt-1">Unique Users</div>
            </div>
          </div>

          {transactions.length === 0 ? (
            <div className="glass-card-lg p-12 text-center">
              <div className="text-5xl mb-3">✅</div>
              <h2 className="text-xl font-bold text-white mb-2">All caught up!</h2>
              <p className="text-white/50">No pending transactions to review.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {transactions.map((tx) => (
                <div key={tx.reference_number} className="glass-card-lg p-6">
                  <div className="flex flex-col lg:flex-row gap-6">
                    <div className="lg:w-1/3">
                      <div className="text-sm font-medium text-white/70 mb-2">Receipt</div>
                      <div className="bg-white/5 rounded-xl p-4 text-center min-h-[180px] flex items-center justify-center">
                        {tx.receipt_url ? (
                          <img src={tx.receipt_url} alt="Receipt" className="max-w-full max-h-64 rounded-lg"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                        ) : (
                          <div className="text-white/30"><div className="text-4xl mb-2">📸</div>No receipt</div>
                        )}
                      </div>
                    </div>
                    <div className="lg:w-1/3 space-y-2">
                      <div className="text-sm font-medium text-white/70 mb-2">Details</div>
                      <div><div className="text-xs text-white/40">Ref #</div><div className="font-mono text-lg text-amber-300">{tx.reference_number}</div></div>
                      <div><div className="text-xs text-white/40">Amount</div><div className="text-xl font-bold text-green-400">₱{parseFloat(tx.amount).toFixed(2)}</div></div>
                      <div><div className="text-xs text-white/40">User</div><div className="text-sm text-white/70 font-mono">{tx.user_id?.slice(0, 12)}...</div></div>
                      <div><div className="text-xs text-white/40">Pack</div><div className="text-sm text-white/70">{tx.pack_id}</div></div>
                    </div>
                    <div className="lg:w-1/3 flex flex-col gap-2 justify-center">
                      <button onClick={() => handleApprove(tx.reference_number)} disabled={processing === tx.reference_number}
                        className="px-6 py-3 rounded-xl bg-green-500/20 hover:bg-green-500/30 border border-green-500/40 text-green-300 font-bold transition disabled:opacity-50">
                        {processing === tx.reference_number ? '...' : '✓ APPROVE'}
                      </button>
                      <button onClick={() => handleReject(tx.reference_number)} disabled={processing === tx.reference_number}
                        className="px-6 py-3 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 font-bold transition disabled:opacity-50">
                        {processing === tx.reference_number ? '...' : '✕ REJECT'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* CARD LIBRARY TAB */}
      {tab === 'cards' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="glass-card p-3 text-sm text-white/40 flex-1 mr-4">
              💡 Editing updates <strong className="text-white/60">base stats</strong> only. Player levels/XP are preserved.
            </div>
            <button
              onClick={() => setAddingCard(true)}
              className="px-4 py-2.5 rounded-xl bg-green-500/20 hover:bg-green-500/30 border border-green-500/40 text-green-300 text-sm font-bold transition flex-shrink-0"
            >
              ＋ Add Card
            </button>
          </div>

          {/* Filter + Sort bar */}
          <div className="glass-card p-3 mb-4 flex flex-wrap items-center gap-3">
            <span className="text-[10px] text-white/30">Sort:</span>
            {(['name', 'rarity', 'faction', 'cost'] as const).map(key => (
              <button key={key} onClick={() => setCardSortBy(key)}
                className={`px-3 py-1 rounded-lg text-xs transition ${
                  cardSortBy === key ? 'bg-amber-500/20 text-amber-300' : 'bg-white/5 text-white/40 hover:bg-white/10'
                }`}>
                {key.charAt(0).toUpperCase() + key.slice(1)}
              </button>
            ))}
            <div className="w-px h-5 bg-white/10" />
            <span className="text-[10px] text-white/30">Rarity:</span>
            <button onClick={() => setCardFilterRarity('all')}
              className={`px-2 py-1 rounded-lg text-xs ${cardFilterRarity === 'all' ? 'bg-white/10 text-white' : 'text-white/30'}`}>All</button>
            {RARITY_OPTIONS.map(r => (
              <button key={r} onClick={() => setCardFilterRarity(r)}
                className="px-2 py-1 rounded-lg text-xs transition"
                style={{ backgroundColor: cardFilterRarity === r ? RARITY_COLORS[r] + '30' : 'transparent', color: cardFilterRarity === r ? RARITY_COLORS[r] : undefined }}>
                {r.charAt(0).toUpperCase() + r.slice(1)}
              </button>
            ))}
            <div className="w-px h-5 bg-white/10" />
            <span className="text-[10px] text-white/30">Faction:</span>
            <button onClick={() => setCardFilterFaction('all')}
              className={`px-2 py-1 rounded-lg text-xs ${cardFilterFaction === 'all' ? 'bg-white/10 text-white' : 'text-white/30'}`}>All</button>
            {FACTION_OPTIONS.map(f => (
              <button key={f} onClick={() => setCardFilterFaction(f)}
                className={`px-2 py-1 rounded-lg text-xs ${cardFilterFaction === f ? 'bg-white/10 text-white' : 'text-white/30'}`}>
                {FACTION_ICONS[f]} {f}
              </button>
            ))}
          </div>

          {/* Give Cards to Users */}
          <div className="glass-card p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-purple-300">🎁 Give Cards to Users</h3>
              <button onClick={loadUsers} className="text-[10px] px-2 py-1 rounded bg-white/10 text-white/50 hover:text-white/80 transition">
                🔄 Load Users
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-white/40 block mb-1">User</label>
                <select
                  value={giveCardUserId}
                  onChange={(e) => setGiveCardUserId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/10 text-white text-xs focus:border-purple-500/50 outline-none"
                >
                  <option value="" className="bg-[#1a1033]">-- Select user --</option>
                  {users.map((u: any) => (
                    <option key={u.id} value={u.id} className="bg-[#1a1033]">
                      {u.display_name || u.email || u.id.slice(0, 8)} ({u.email || 'no email'})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-white/40 block mb-1">Card</label>
                <select
                  value={giveCardCardId}
                  onChange={(e) => setGiveCardCardId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/10 text-white text-xs focus:border-purple-500/50 outline-none"
                >
                  <option value="" className="bg-[#1a1033]">-- Select card --</option>
                  {cards.sort((a: any, b: any) => (a.name || '').localeCompare(b.name || '')).map((card: any) => (
                    <option key={card.id} value={card.id} className="bg-[#1a1033]">
                      {card.name} ({card.rarity}) {card.faction && FACTION_ICONS[card.faction as keyof typeof FACTION_ICONS]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-3 items-center">
              <button
                onClick={giveCardToUser}
                disabled={givingCard || !giveCardUserId || !giveCardCardId}
                className="px-4 py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-300 text-sm font-bold transition disabled:opacity-30"
              >
                {givingCard ? 'Giving...' : '🎁 Give Card'}
              </button>
              {giveCardResult && (
                <span className="text-xs text-green-400 font-medium">{giveCardResult}</span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {cards
              .filter(c => cardFilterRarity === 'all' || c.rarity === cardFilterRarity)
              .filter(c => cardFilterFaction === 'all' || c.faction === cardFilterFaction)
              .sort((a, b) => {
                switch (cardSortBy) {
                  case 'name': return (a.name || '').localeCompare(b.name || '')
                  case 'rarity': return (RARITY_OPTIONS.indexOf(a.rarity) - RARITY_OPTIONS.indexOf(b.rarity))
                  case 'faction': return (a.faction || '').localeCompare(b.faction || '')
                  case 'cost': return (a.cost || 0) - (b.cost || 0)
                  default: return 0
                }
              })
              .map((card: any) => {
              const rarity = (card.rarity || 'common') as CardRarity
              const rarityColor = RARITY_COLORS[rarity] || '#94a3b8'
              const factionIcon = FACTION_ICONS[card.faction as keyof typeof FACTION_ICONS] || ''
              const s = card.stats || {}

              return (
                <button
                  key={card.id}
                  onClick={() => openEditCard(card)}
                  className="group relative rounded-xl overflow-hidden transition-all duration-200 hover:scale-[1.04] hover:z-10"
                  style={{ boxShadow: `0 4px 16px ${rarityColor}15, 0 0 0 1px ${rarityColor}30` }}
                >
                  {/* Card image */}
                  <div className="aspect-[2/3] bg-white/5 relative">
                    {card.art_url ? (
                      <img src={card.art_url} alt={card.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-5xl opacity-20">
                        {factionIcon}
                      </div>
                    )}

                    {/* Rarity glow */}
                    <div className="absolute inset-0 pointer-events-none"
                      style={{ background: `linear-gradient(180deg, ${rarityColor}20 0%, transparent 50%, ${rarityColor}10 100%)` }} />

                    {/* Rarity badge */}
                    <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md text-[10px] font-bold"
                      style={{ backgroundColor: rarityColor + '40', color: rarityColor }}>
                      {rarity.toUpperCase()}
                    </div>

                    {/* Stats overlay */}
                    <div className="absolute top-2 right-2 flex flex-col gap-0.5">
                      {STAT_KEYS.map((key) => (
                        <div key={key} className="text-[8px] text-right px-1 py-0.5 rounded bg-black/50 text-white/70">
                          {s[key] || 0} {key.slice(0, 3)}
                        </div>
                      ))}
                    </div>

                    {/* Ability indicator */}
                    {card.ability && (
                      <div className="absolute bottom-8 left-2 right-2 text-[9px] text-amber-300/80 truncate bg-black/40 px-1 rounded">
                        ⚡ {card.ability.name}
                      </div>
                    )}

                    {/* Name + edit at bottom */}
                    <div className="absolute bottom-0 left-0 right-0 px-2 pb-2 pt-6 bg-gradient-to-t from-black/85 to-transparent">
                      <div className="text-[11px] font-bold text-white truncate leading-tight">
                        {factionIcon} {card.name}
                      </div>
                      <div className="text-[9px] text-white/30 mt-0.5">{card.title}</div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* META TAB */}
      {tab === 'meta' && (
        <MetaTab cards={cards} loadCards={loadCards} />
      )}

      {/* ECONOMY TAB */}
      {tab === 'economy' && (
        <EconomyTab />
      )}

      {/* EDIT CARD MODAL */}
      {editingCard && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setEditingCard(null)}>
          <div className="glass-card-lg p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-amber-300">✏️ Edit Card</h2>
              <button onClick={() => setEditingCard(null)} className="text-white/30 hover:text-white/80 text-xl">✕</button>
            </div>

            <div className="space-y-3">
              {/* Name & Title */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-white/40 block mb-1">Name</label>
                  <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/10 text-white text-sm focus:border-amber-500/50 outline-none" />
                </div>
                <div>
                  <label className="text-[10px] text-white/40 block mb-1">Title</label>
                  <input value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/10 text-white text-sm focus:border-amber-500/50 outline-none" />
                </div>
              </div>

              {/* Card Art */}
              <div>
                <label className="text-[10px] text-white/40 block mb-2">
                  🖼️ Card Art <span className="text-white/20">(400×560px PNG recommended)</span>
                </label>
                {editImagePreview && (
                  <div className="mb-2 relative inline-block">
                    <img src={editImagePreview} alt="Preview" className="w-24 h-32 object-cover rounded-lg border border-white/10" />
                    <button
                      onClick={() => { setEditImagePreview(''); setEditImageFile(null) }}
                      className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center"
                    >✕</button>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      setEditImageFile(file)
                      setEditImagePreview(URL.createObjectURL(file))
                    }
                  }}
                  className="w-full text-xs text-white/40 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-white/10 file:text-white/70 file:text-xs hover:file:bg-white/15"
                />
              </div>

              {/* Rarity & Faction */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-white/40 block mb-1">Rarity</label>
                  <select value={editForm.rarity} onChange={(e) => setEditForm({ ...editForm, rarity: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/10 text-white text-sm focus:border-amber-500/50 outline-none">
                    {RARITY_OPTIONS.map((r) => (
                      <option key={r} value={r} className="bg-[#1a1033]">{r.toUpperCase()}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-white/40 block mb-1">Faction</label>
                  <select value={editForm.faction} onChange={(e) => setEditForm({ ...editForm, faction: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/10 text-white text-sm focus:border-amber-500/50 outline-none">
                    {FACTION_OPTIONS.map((f) => (
                      <option key={f} value={f} className="bg-[#1a1033]">{FACTION_ICONS[f]} {f}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Cost & Pack Source */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-white/40 block mb-1">Cost (₱)</label>
                  <input type="number" value={editForm.cost} onChange={(e) => setEditForm({ ...editForm, cost: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/10 text-white text-sm focus:border-amber-500/50 outline-none" min={1} max={10} />
                </div>
                <div>
                  <label className="text-[10px] text-white/40 block mb-1">Pack Source</label>
                  <input value={editForm.pack_source} onChange={(e) => setEditForm({ ...editForm, pack_source: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/10 text-white text-sm focus:border-amber-500/50 outline-none" />
                </div>
              </div>

              {/* Base Stats */}
              <div>
                <label className="text-[10px] text-white/40 block mb-2">Base Stats (changes affect future level scaling)</label>
                <div className="grid grid-cols-4 gap-2">
                  {STAT_KEYS.map((key) => (
                    <div key={key}>
                      <label className="text-[9px] text-white/30 block mb-0.5 capitalize">{key}</label>
                      <input type="number" value={editForm[key]} onChange={(e) => setEditForm({ ...editForm, [key]: e.target.value })}
                        className="w-full px-2 py-1.5 rounded-lg bg-white/10 border border-white/10 text-white text-sm text-center focus:border-amber-500/50 outline-none" min={0} max={20} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Ability */}
              <div className="glass-card p-3">
                <label className="text-[10px] text-white/40 block mb-2">Ability (leave name empty to remove)</label>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <input placeholder="Ability name" value={editForm.ability_name}
                    onChange={(e) => setEditForm({ ...editForm, ability_name: e.target.value })}
                    className="px-2 py-1.5 rounded-lg bg-white/10 border border-white/10 text-white text-xs focus:border-amber-500/50 outline-none" />
                  <input placeholder="Type (e.g. vote_buy)" value={editForm.ability_type}
                    onChange={(e) => setEditForm({ ...editForm, ability_type: e.target.value })}
                    className="px-2 py-1.5 rounded-lg bg-white/10 border border-white/10 text-white text-xs focus:border-amber-500/50 outline-none" />
                </div>
                <input placeholder="Description" value={editForm.ability_desc}
                  onChange={(e) => setEditForm({ ...editForm, ability_desc: e.target.value })}
                  className="w-full px-2 py-1.5 rounded-lg bg-white/10 border border-white/10 text-white text-xs mb-2 focus:border-amber-500/50 outline-none" />
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[9px] text-white/30 block mb-0.5">Power</label>
                    <input type="number" value={editForm.ability_power}
                      onChange={(e) => setEditForm({ ...editForm, ability_power: e.target.value })}
                      className="w-full px-2 py-1 rounded-lg bg-white/10 border border-white/10 text-white text-xs text-center focus:border-amber-500/50 outline-none" min={0} />
                  </div>
                  <div>
                    <label className="text-[9px] text-white/30 block mb-0.5">Cooldown</label>
                    <input type="number" value={editForm.ability_cooldown}
                      onChange={(e) => setEditForm({ ...editForm, ability_cooldown: e.target.value })}
                      className="w-full px-2 py-1 rounded-lg bg-white/10 border border-white/10 text-white text-xs text-center focus:border-amber-500/50 outline-none" min={0} />
                  </div>
                  <div>
                    <label className="text-[9px] text-white/30 block mb-0.5">Trigger</label>
                    <select value={editForm.ability_trigger}
                      onChange={(e) => setEditForm({ ...editForm, ability_trigger: e.target.value })}
                      className="w-full px-2 py-1 rounded-lg bg-white/10 border border-white/10 text-white text-xs focus:border-amber-500/50 outline-none">
                      <option value="active" className="bg-[#1a1033]">active</option>
                      <option value="on_play" className="bg-[#1a1033]">on_play</option>
                      <option value="on_destroy" className="bg-[#1a1033]">on_destroy</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Flavor text */}
              <div>
                <label className="text-[10px] text-white/40 block mb-1">Flavor Text</label>
                <textarea value={editForm.flavor_text} onChange={(e) => setEditForm({ ...editForm, flavor_text: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/10 text-white text-xs focus:border-amber-500/50 outline-none resize-none" rows={2} />
              </div>
            </div>

            <div className="flex gap-3 mt-4">
              <button onClick={() => setEditingCard(null)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-white/10 text-white/60 hover:bg-white/15 text-sm transition">
                Cancel
              </button>
              <button
                onClick={() => handleDeleteCard(editingCard.id, editingCard.name)}
                disabled={deleting}
                className="px-4 py-2.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-300 text-sm font-medium transition disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : '🗑 Delete'}
              </button>
              <button onClick={saveCard} disabled={saving}
                className="flex-1 px-4 py-2.5 rounded-xl btn-gradient text-white font-bold text-sm disabled:opacity-50">
                {saving ? 'Saving...' : '💾 Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD CARD MODAL */}
      {addingCard && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setAddingCard(false)}>
          <div className="glass-card-lg p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-green-400">＋ Add New Card</h2>
              <button onClick={() => setAddingCard(false)} className="text-white/30 hover:text-white/80 text-xl">✕</button>
            </div>

            <div className="text-xs text-white/40 mb-4 p-3 rounded-lg bg-green-500/5 border border-green-500/10">
              💡 New cards are <strong className="text-green-400">automatically included</strong> in pack openings. The pack opener pulls from all cards in the library grouped by rarity — your new card will appear in packs that match its rarity weight tier.
            </div>

            <div className="space-y-3">
              {/* Card Art */}
              <div>
                <label className="text-[10px] text-white/40 block mb-2">
                  🖼️ Card Art <span className="text-white/20">(400×560px PNG recommended)</span>
                </label>
                {addImagePreview && (
                  <div className="mb-2 relative inline-block">
                    <img src={addImagePreview} alt="Preview" className="w-24 h-32 object-cover rounded-lg border border-white/10" />
                    <button
                      onClick={() => { setAddImagePreview(''); setAddImageFile(null) }}
                      className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center"
                    >✕</button>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      setAddImageFile(file)
                      setAddImagePreview(URL.createObjectURL(file))
                    }
                  }}
                  className="w-full text-xs text-white/40 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-white/10 file:text-white/70 file:text-xs hover:file:bg-white/15"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-white/40 block mb-1">Name *</label>
                  <input value={addForm.name} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/10 text-white text-sm focus:border-green-500/50 outline-none" placeholder="Card name" />
                </div>
                <div>
                  <label className="text-[10px] text-white/40 block mb-1">Title</label>
                  <input value={addForm.title} onChange={(e) => setAddForm({ ...addForm, title: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/10 text-white text-sm focus:border-green-500/50 outline-none" placeholder="e.g. Mayor of Talisay" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-white/40 block mb-1">Rarity *</label>
                  <select value={addForm.rarity} onChange={(e) => setAddForm({ ...addForm, rarity: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/10 text-white text-sm focus:border-green-500/50 outline-none">
                    {RARITY_OPTIONS.map((r) => <option key={r} value={r} className="bg-[#1a1033]">{r.toUpperCase()}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-white/40 block mb-1">Faction *</label>
                  <select value={addForm.faction} onChange={(e) => setAddForm({ ...addForm, faction: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/10 text-white text-sm focus:border-green-500/50 outline-none">
                    {FACTION_OPTIONS.map((f) => <option key={f} value={f} className="bg-[#1a1033]">{FACTION_ICONS[f]} {f}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-white/40 block mb-1">Cost (₱)</label>
                  <input type="number" value={addForm.cost} onChange={(e) => setAddForm({ ...addForm, cost: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/10 text-white text-sm focus:border-green-500/50 outline-none" min={1} max={10} />
                </div>
                <div>
                  <label className="text-[10px] text-white/40 block mb-1">Pack Source</label>
                  <input value={addForm.pack_source} onChange={(e) => setAddForm({ ...addForm, pack_source: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/10 text-white text-sm focus:border-green-500/50 outline-none" />
                </div>
              </div>
              <div>
                <label className="text-[10px] text-white/40 block mb-2">Base Stats</label>
                <div className="grid grid-cols-4 gap-2">
                  {STAT_KEYS.map((key) => (
                    <div key={key}>
                      <label className="text-[9px] text-white/30 block mb-0.5 capitalize">{key}</label>
                      <input type="number" value={addForm[key]} onChange={(e) => setAddForm({ ...addForm, [key]: e.target.value })}
                        className="w-full px-2 py-1.5 rounded-lg bg-white/10 border border-white/10 text-white text-sm text-center focus:border-green-500/50 outline-none" min={0} max={20} />
                    </div>
                  ))}
                </div>
              </div>
              <div className="glass-card p-3">
                <label className="text-[10px] text-white/40 block mb-2">Ability (optional)</label>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <input placeholder="Ability name" value={addForm.ability_name}
                    onChange={(e) => setAddForm({ ...addForm, ability_name: e.target.value })}
                    className="px-2 py-1.5 rounded-lg bg-white/10 border border-white/10 text-white text-xs focus:border-green-500/50 outline-none" />
                  <input placeholder="Type" value={addForm.ability_type}
                    onChange={(e) => setAddForm({ ...addForm, ability_type: e.target.value })}
                    className="px-2 py-1.5 rounded-lg bg-white/10 border border-white/10 text-white text-xs focus:border-green-500/50 outline-none" />
                </div>
                <input placeholder="Description" value={addForm.ability_desc}
                  onChange={(e) => setAddForm({ ...addForm, ability_desc: e.target.value })}
                  className="w-full px-2 py-1.5 rounded-lg bg-white/10 border border-white/10 text-white text-xs mb-2 focus:border-green-500/50 outline-none" />
                <div className="grid grid-cols-3 gap-2">
                  <div><label className="text-[9px] text-white/30 block mb-0.5">Power</label>
                    <input type="number" value={addForm.ability_power} onChange={(e) => setAddForm({ ...addForm, ability_power: e.target.value })}
                      className="w-full px-2 py-1 rounded-lg bg-white/10 border border-white/10 text-white text-xs text-center focus:border-green-500/50 outline-none" /></div>
                  <div><label className="text-[9px] text-white/30 block mb-0.5">Cooldown</label>
                    <input type="number" value={addForm.ability_cooldown} onChange={(e) => setAddForm({ ...addForm, ability_cooldown: e.target.value })}
                      className="w-full px-2 py-1 rounded-lg bg-white/10 border border-white/10 text-white text-xs text-center focus:border-green-500/50 outline-none" /></div>
                  <div><label className="text-[9px] text-white/30 block mb-0.5">Trigger</label>
                    <select value={addForm.ability_trigger} onChange={(e) => setAddForm({ ...addForm, ability_trigger: e.target.value })}
                      className="w-full px-2 py-1 rounded-lg bg-white/10 border border-white/10 text-white text-xs focus:border-green-500/50 outline-none">
                      <option value="active" className="bg-[#1a1033]">active</option>
                      <option value="on_play" className="bg-[#1a1033]">on_play</option>
                      <option value="on_destroy" className="bg-[#1a1033]">on_destroy</option>
                    </select></div>
                </div>
              </div>
              <div>
                <label className="text-[10px] text-white/40 block mb-1">Flavor Text</label>
                <textarea value={addForm.flavor_text} onChange={(e) => setAddForm({ ...addForm, flavor_text: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/10 text-white text-xs focus:border-green-500/50 outline-none resize-none" rows={2} />
              </div>
            </div>

            <div className="flex gap-3 mt-4">
              <button onClick={() => setAddingCard(false)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-white/10 text-white/60 hover:bg-white/15 text-sm transition">Cancel</button>
              <button onClick={createCard} disabled={saving || !addForm.name.trim()}
                className="flex-1 px-4 py-2.5 rounded-xl bg-green-500/30 hover:bg-green-500/40 border border-green-500/40 text-green-300 font-bold text-sm disabled:opacity-30 transition">
                {saving ? 'Creating...' : '＋ Create Card'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
