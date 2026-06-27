'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { SHOP_PACKS, generateCentavoAmount, RARITY_COLORS } from '@/lib/card-data'
import { uploadReceipt, createTransaction } from '@/lib/shop-service'
import type { ShopPack } from '@/lib/types'

const GCASH_NUMBER = '09298492563'

export default function ShopClient() {
  const [selectedPack, setSelectedPack] = useState<ShopPack | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [paymentAmount, setPaymentAmount] = useState<number>(0)
  const [referenceNumber, setReferenceNumber] = useState('')
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const router = useRouter()
  // Map local pack names to Supabase UUIDs
  const [packIdMap, setPackIdMap] = useState<Record<string, string>>({})

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id)
    })
    // Fetch real pack IDs from Supabase to map local IDs -> UUIDs
    supabase
      .from('shop_packs')
      .select('id, name')
      .then(({ data, error }) => {
        if (data) {
          const map: Record<string, string> = {}
          for (const pack of SHOP_PACKS) {
            const match = data.find((d: any) => d.name === pack.name)
            if (match) map[pack.id] = match.id
          }
          setPackIdMap(map)
        }
      })
  }, [])

  const handleSelectPack = (pack: ShopPack) => {
    setSelectedPack(pack)
    setPaymentAmount(generateCentavoAmount(pack.price))
    setReferenceNumber('')
    setReceiptFile(null)
    setMessage('')
    setError('')
    setSubmitted(false)
  }

  const handleSubmit = async () => {
    if (!userId || !selectedPack || !receiptFile) {
      setError('Please fill in all fields and upload a receipt.')
      return
    }
    if (!/^\d{13}$/.test(referenceNumber)) {
      setError('Reference number must be exactly 13 digits.')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      // Upload receipt to Supabase Storage
      const receiptUrl = await uploadReceipt(userId, receiptFile, referenceNumber)

      // Map local pack ID to Supabase UUID
      const realPackId = packIdMap[selectedPack.id] || selectedPack.id

      // Create transaction record
      await createTransaction({
        reference_number: referenceNumber,
        user_id: userId,
        amount: paymentAmount,
        pack_id: realPackId,
        receipt_url: receiptUrl,
      })

      setMessage('Receipt submitted! Your payment is pending admin approval. You will receive your packs once verified.')
      setSubmitted(true)
      setReferenceNumber('')
      setReceiptFile(null)
    } catch (err: any) {
      setError(err.message || 'Failed to submit receipt. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold gradient-text mb-3">🛒 Premium Shop</h1>
        <p className="text-white/60 max-w-xl mx-auto">
          Buy premium card packs via GCash. Send the exact amount, upload your receipt, and get your packs after admin verification.
        </p>
      </div>

      {/* Packs Grid */}
      {!selectedPack && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 justify-center">
          {SHOP_PACKS.map((pack) => (
            <div
              key={pack.id}
              className="glass-card-lg p-6 flex flex-col hover:scale-[1.02] transition cursor-pointer"
              onClick={() => handleSelectPack(pack)}
            >
              <div className="text-5xl text-center mb-4">🎴</div>
              <h3 className="text-lg font-bold text-amber-300 text-center mb-2">{pack.name}</h3>
              <p className="text-sm text-white/60 text-center mb-4 flex-1">{pack.description}</p>
              <div className="text-center mb-3">
                <span className="text-2xl font-bold text-amber-400">₱{pack.price}</span>
              </div>
              <div className="text-xs text-white/40 text-center mb-3">
                {pack.card_count} cards • Guaranteed {pack.guaranteed_rarity}+
              </div>
              <div className="flex justify-center gap-2 mb-4">
                {(['common', 'rare', 'epic', 'mythic', 'legendary'] as const).map((r) => (
                  <div
                    key={r}
                    className="w-3 h-3 rounded-full"
                    style={{ background: RARITY_COLORS[r] }}
                    title={r}
                  />
                ))}
              </div>
              <button className="px-4 py-2 rounded-lg btn-gradient text-white font-medium text-sm">
                Buy Now
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Payment Flow */}
      {selectedPack && (
        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => setSelectedPack(null)}
            className="text-white/50 hover:text-white text-sm mb-4"
          >
            ← Back to shop
          </button>

          <div className="glass-card-lg p-8">
            <h2 className="text-2xl font-bold text-amber-300 mb-2">Payment for {selectedPack.name}</h2>
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-6">
              <div className="text-sm text-white/60 mb-2">Send exactly this amount via GCash:</div>
              <div className="text-3xl font-bold text-amber-400 mb-2">₱{paymentAmount.toFixed(2)}</div>
              <div className="text-sm text-white/50">GCash Number: <span className="font-mono text-amber-300">{GCASH_NUMBER}</span></div>
              <div className="text-xs text-white/40 mt-2">
                💡 The centavo amount (₱{paymentAmount.toFixed(2)}) helps us identify your payment. Send the EXACT amount shown.
              </div>
            </div>

            {/* Reference Number Input */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-white/70 mb-2">
                GCash Reference Number (13 digits)
              </label>
              <input
                type="text"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value.replace(/\D/g, '').slice(0, 13))}
                placeholder="e.g., 1234567890123"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-mono text-lg focus:outline-none focus:border-amber-400/50"
                maxLength={13}
              />
              <div className="text-xs text-white/40 mt-1">{referenceNumber.length}/13 digits</div>
            </div>

            {/* Receipt Upload */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-white/70 mb-2">
                Upload GCash Receipt Screenshot
              </label>
              <div className="border-2 border-dashed border-white/15 rounded-xl p-6 text-center hover:border-amber-400/40 transition cursor-pointer"
                onClick={() => document.getElementById('receipt-upload')?.click()}
              >
                <input
                  id="receipt-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) setReceiptFile(file)
                  }}
                />
                {receiptFile ? (
                  <div>
                    <div className="text-4xl mb-2">✅</div>
                    <div className="text-sm text-white/70">{receiptFile.name}</div>
                    <div className="text-xs text-white/40 mt-1">Click to change</div>
                  </div>
                ) : (
                  <div>
                    <div className="text-4xl mb-2">📸</div>
                    <div className="text-sm text-white/60">Click to upload receipt screenshot</div>
                    <div className="text-xs text-white/40 mt-1">PNG, JPG up to 5MB</div>
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 mb-4 text-sm text-rose-300">
                {error}
              </div>
            )}

            {message && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 mb-4">
                <div className="text-sm text-green-300 mb-3">{message}</div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setSelectedPack(null)}
                    className="px-4 py-2 rounded-lg bg-white/10 text-white text-sm hover:bg-white/20 transition"
                  >
                    Buy Another Pack
                  </button>
                  <button
                    onClick={() => router.push('/dashboard')}
                    className="px-4 py-2 rounded-lg btn-gradient text-white text-sm font-medium"
                  >
                    View Purchase Status →
                  </button>
                </div>
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={submitting || !referenceNumber || !receiptFile || !userId}
              className="w-full px-6 py-3 rounded-xl btn-gradient text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Submitting...' : 'Submit Receipt for Verification'}
            </button>

            {!userId && (
              <div className="text-center mt-4 text-sm text-white/50">
                Please <a href="/login" className="text-amber-400 hover:underline">sign in</a> to make a purchase.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}