import { NextResponse } from 'next/server'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'

const META_PATH = join(process.cwd(), 'data', 'meta-state.json')

function readMeta(): any {
  if (!existsSync(META_PATH)) {
    return { activeBuffs: [], rarityOverrides: [], currentSeason: null, history: [] }
  }
  return JSON.parse(readFileSync(META_PATH, 'utf-8'))
}

function writeMeta(data: any) {
  writeFileSync(META_PATH, JSON.stringify(data, null, 2), 'utf-8')
}

// GET — fetch current meta state
export async function GET() {
  const meta = readMeta()
  return NextResponse.json({ success: true, meta })
}

// POST — update meta state
export async function POST(request: Request) {
  const body = await request.json()
  const { action, payload } = body

  const meta = readMeta()

  switch (action) {
    case 'addBuff': {
      meta.activeBuffs.push({
        id: crypto.randomUUID(),
        ...payload,
        createdAt: new Date().toISOString(),
      })
      meta.history.push({ action: 'addBuff', payload, timestamp: new Date().toISOString() })
      break
    }
    case 'removeBuff': {
      const idx = meta.activeBuffs.findIndex((b: any) => b.id === payload.id)
      if (idx >= 0) {
        const removed = meta.activeBuffs.splice(idx, 1)[0]
        meta.history.push({ action: 'removeBuff', payload: removed, timestamp: new Date().toISOString() })
      }
      break
    }
    case 'setRarityOverride': {
      const existing = meta.rarityOverrides.findIndex((r: any) => r.cardId === payload.cardId)
      if (existing >= 0) {
        meta.rarityOverrides[existing] = { ...payload, updatedAt: new Date().toISOString() }
      } else {
        meta.rarityOverrides.push({ ...payload, createdAt: new Date().toISOString() })
      }
      meta.history.push({ action: 'setRarityOverride', payload, timestamp: new Date().toISOString() })
      break
    }
    case 'removeRarityOverride': {
      meta.rarityOverrides = meta.rarityOverrides.filter((r: any) => r.cardId !== payload.cardId)
      meta.history.push({ action: 'removeRarityOverride', payload, timestamp: new Date().toISOString() })
      break
    }
    case 'setSeason': {
      meta.currentSeason = { ...payload, createdAt: new Date().toISOString() }
      meta.history.push({ action: 'setSeason', payload, timestamp: new Date().toISOString() })
      break
    }
    case 'clearSeason': {
      meta.currentSeason = null
      meta.history.push({ action: 'clearSeason', payload: null, timestamp: new Date().toISOString() })
      break
    }
    case 'clearAll': {
      meta.activeBuffs = []
      meta.rarityOverrides = []
      meta.currentSeason = null
      meta.history.push({ action: 'clearAll', payload: null, timestamp: new Date().toISOString() })
      break
    }
    default:
      return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 })
  }

  // Keep only last 100 history entries
  if (meta.history.length > 100) {
    meta.history = meta.history.slice(-100)
  }

  writeMeta(meta)
  return NextResponse.json({ success: true, meta })
}
