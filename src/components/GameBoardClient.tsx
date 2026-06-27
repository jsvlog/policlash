'use client'

import { useState, useCallback } from 'react'
import type { GameState, GameCard, BoardPosition } from '@/lib/types'
import {
  createNewGame, playCard, useAbility, attack, endTurn,
  getEffectiveStats, getRarityColor, getDefaultPlayerDeck, isGameOver
} from '@/lib/game-engine'
import { RARITY_COLORS, FACTION_ICONS, FACTION_COLORS } from '@/lib/card-data'

export default function GameBoardClient() {
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy')
  const [selectedHandCard, setSelectedHandCard] = useState<number | null>(null)
  const [selectedBoardCard, setSelectedBoardCard] = useState<number | null>(null)
  const [mode, setMode] = useState<'play' | 'target'>('play')

  const startGame = useCallback(() => {
    const deck = getDefaultPlayerDeck()
    // Shuffle deck
    const shuffled = [...deck].sort(() => Math.random() - 0.5)
    setGameState(createNewGame(shuffled, difficulty))
    setSelectedHandCard(null)
    setSelectedBoardCard(null)
    setMode('play')
  }, [difficulty])

  const handleBoardSlotClick = (idx: number) => {
    if (!gameState || gameState.current_turn !== 'player' || isGameOver(gameState)) return

    if (mode === 'target' && selectedBoardCard !== null) {
      // Attack this slot
      setGameState(attack(gameState, selectedBoardCard, idx))
      setSelectedBoardCard(null)
      setMode('play')
    } else if (selectedHandCard !== null) {
      // Play card from hand
      setGameState(playCard(gameState, selectedHandCard, idx))
      setSelectedHandCard(null)
    }
  }

  const handleAttackDirect = () => {
    if (!gameState || selectedBoardCard === null) return
    setGameState(attack(gameState, selectedBoardCard, -1))
    setSelectedBoardCard(null)
    setMode('play')
  }

  const handleUseAbility = (idx: number) => {
    if (!gameState) return
    setGameState(useAbility(gameState, idx))
  }

  const handleEndTurn = () => {
    if (!gameState) return
    setGameState(endTurn(gameState))
    setSelectedHandCard(null)
    setSelectedBoardCard(null)
    setMode('play')
  }

  if (!gameState) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <h1 className="text-4xl font-bold gradient-text mb-6">Start a New Game</h1>
        <p className="text-white/60 mb-8">Choose your difficulty and build your political empire.</p>
        <div className="flex justify-center gap-4 mb-8">
          {(['easy', 'medium', 'hard'] as const).map((d) => (
            <button
              key={d}
              onClick={() => setDifficulty(d)}
              className={`px-6 py-3 rounded-xl font-medium transition ${
                difficulty === d
                  ? 'btn-gradient text-white'
                  : 'bg-white/10 text-white/60 hover:bg-white/15'
              }`}
            >
              {d === 'easy' ? '🟢 Easy' : d === 'medium' ? '🟡 Medium' : '🔴 Hard'}
            </button>
          ))}
        </div>
        <button onClick={startGame} className="px-8 py-3 rounded-xl btn-gradient text-white font-bold text-lg">
          🎮 Start Game
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Game Status Bar */}
      <div className="glass-card p-4 mb-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div>
            <span className="text-sm text-white/50">Turn</span>
            <span className="text-xl font-bold ml-2">{gameState.turn_number}</span>
          </div>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            gameState.current_turn === 'player' ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'
          }`}>
            {gameState.current_turn === 'player' ? 'Your Turn' : "Opponent's Turn"}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-sm text-white/50">Your Health</div>
            <div className="text-lg font-bold text-green-400">{gameState.player.health} ❤️</div>
          </div>
          <div className="text-right">
            <div className="text-sm text-white/50">Budget</div>
            <div className="text-lg font-bold text-amber-400">₱{gameState.player.budget_pool}</div>
          </div>
          {gameState.current_turn === 'player' && !isGameOver(gameState) && (
            <button onClick={handleEndTurn} className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white font-medium transition">
              End Turn →
            </button>
          )}
        </div>
      </div>

      {/* Opponent Area */}
      <div className="glass-card p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-rose-300">🏛️ {gameState.opponent.name}</span>
          <span className="text-lg font-bold text-rose-400">{gameState.opponent.health} ❤️</span>
        </div>
        {/* Opponent hand (face down) */}
        <div className="flex gap-2 mb-3">
          {gameState.opponent.hand.map((_, i) => (
            <div key={i} className="w-10 h-14 rounded-lg game-card-face-down border-2 border-white/10" />
          ))}
        </div>
        {/* Opponent board */}
        <div className="flex gap-3 justify-center min-h-[200px] items-center">
          {gameState.opponent.board.map((pos, i) => (
            <BoardSlot
              key={i}
              pos={pos}
              onClick={() => mode === 'target' && handleBoardSlotClick(i)}
              selectable={mode === 'target'}
              isOpponent
            />
          ))}
        </div>
      </div>

      {/* Action Bar */}
      {mode === 'target' && (
        <div className="glass-card p-3 mb-4 flex items-center justify-center gap-4">
          <span className="text-amber-300 text-sm">Select a target to attack, or:</span>
          <button onClick={handleAttackDirect} className="px-4 py-1.5 rounded-lg btn-gradient text-white text-sm font-medium">
            Attack Directly
          </button>
          <button onClick={() => { setMode('play'); setSelectedBoardCard(null); }} className="text-white/50 text-sm hover:text-white">
            Cancel
          </button>
        </div>
      )}

      {/* Player Board */}
      <div className="glass-card p-4 mb-4">
        <div className="flex gap-3 justify-center min-h-[200px] items-center">
          {gameState.player.board.map((pos, i) => (
            <BoardSlot
              key={i}
              pos={pos}
              onClick={() => handleBoardSlotClick(i)}
              selectable={selectedHandCard !== null}
              onUseAbility={() => handleUseAbility(i)}
              onSelectForAttack={() => { setSelectedBoardCard(i); setMode('target') }}
              isSelected={selectedBoardCard === i}
            />
          ))}
        </div>
      </div>

      {/* Player Hand */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-green-300">🃏 Your Hand ({gameState.player.hand.length})</span>
          <span className="text-sm text-white/50">Cards in deck: {gameState.player.deck.length}</span>
        </div>
        <div className="flex gap-3 flex-wrap justify-center">
          {gameState.player.hand.length === 0 && (
            <span className="text-white/30 py-8">No cards in hand</span>
          )}
          {gameState.player.hand.map((card, i) => (
            <CardMini
              key={i}
              card={card}
              selected={selectedHandCard === i}
              onClick={() => {
                setSelectedHandCard(selectedHandCard === i ? null : i)
                setMode('play')
              }}
              affordable={gameState.player.budget_pool >= card.cost}
            />
          ))}
        </div>
      </div>

      {/* Game Log */}
      <div className="glass-card p-4 mt-4 max-h-40 overflow-y-auto">
        <div className="text-sm font-medium text-white/50 mb-2">Battle Log</div>
        <div className="space-y-1 text-sm text-white/70">
          {gameState.log.slice(-15).map((entry, i) => (
            <div key={i}>{entry}</div>
          ))}
        </div>
      </div>

      {/* Game Over Modal */}
      {isGameOver(gameState) && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="glass-card-lg p-8 text-center max-w-md">
            <div className="text-6xl mb-4">
              {gameState.status === 'player_win' ? '🏆' : '💀'}
            </div>
            <h2 className="text-3xl font-bold mb-2">
              {gameState.status === 'player_win' ? 'Victory!' : 'Defeat!'}
            </h2>
            <p className="text-white/60 mb-6">
              {gameState.status === 'player_win'
                ? 'You have outplayed the trapos. The barangay is yours.'
                : 'The trapos have won this round. Try again!'}
            </p>
            <button onClick={startGame} className="px-6 py-3 rounded-xl btn-gradient text-white font-bold">
              Play Again
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ---- Board Slot Component ----
function BoardSlot({
  pos, onClick, selectable, isOpponent, onUseAbility, onSelectForAttack, isSelected
}: {
  pos: BoardPosition
  onClick: () => void
  selectable?: boolean
  isOpponent?: boolean
  onUseAbility?: () => void
  onSelectForAttack?: () => void
  isSelected?: boolean
}) {
  if (!pos.card) {
    return (
      <div
        onClick={onClick}
        className={`w-[140px] h-[180px] rounded-xl border-2 border-dashed flex items-center justify-center transition ${
          selectable
            ? 'border-amber-400/40 hover:border-amber-400/80 cursor-pointer'
            : 'border-white/10'
        }`}
      >
        <span className="text-white/20 text-sm">Empty</span>
      </div>
    )
  }

  const card = pos.card
  const stats = getEffectiveStats(pos)
  const rarityColor = RARITY_COLORS[card.rarity] || '#94a3b8'
  const factionColor = FACTION_COLORS[card.faction] || '#666'

  return (
    <div
      onClick={onClick}
      className={`game-card p-2 flex flex-col ${
        isSelected ? 'ring-2 ring-amber-400' : ''
      } ${pos.immunity_active ? 'ring-2 ring-blue-400' : ''}`}
      style={{ borderColor: rarityColor }}
    >
      {/* Card header */}
      <div className="text-center mb-1">
        <div className="text-xs px-1 rounded-full inline-block" style={{ backgroundColor: factionColor + '33', color: factionColor }}>
          {FACTION_ICONS[card.faction]} {card.faction.toUpperCase()}
        </div>
      </div>
      <div className="text-sm font-bold text-center mb-1 text-white truncate">{card.name}</div>
      <div className="text-[10px] text-white/40 text-center mb-2 truncate">{card.title}</div>

      {/* Stats */}
      <div className="space-y-1 flex-1">
        {[
          { label: 'CHA', val: stats.charisma, color: '#ff6b6b' },
          { label: 'MAC', val: stats.machinery, color: '#3b82f6' },
          { label: 'BUD', val: stats.budget, color: '#facc15' },
          { label: 'INF', val: stats.influence, color: '#a855f7' },
        ].map((s) => (
          <div key={s.label} className="flex items-center gap-1">
            <span className="text-[9px] text-white/40 w-6">{s.label}</span>
            <div className="stat-bar flex-1">
              <div className="stat-bar-fill" style={{ width: `${(s.val / 10) * 100}%`, background: s.color }} />
            </div>
            <span className="text-[9px] text-white/60 w-4 text-right">{s.val}</span>
          </div>
        ))}
      </div>

      {/* Ability indicator */}
      {card.ability && !isOpponent && (
        <button
          onClick={(e) => { e.stopPropagation(); onUseAbility?.() }}
          disabled={pos.ability_used_this_turn}
          className={`mt-1 text-[10px] px-1 py-0.5 rounded font-medium transition ${
            pos.ability_used_this_turn
              ? 'bg-white/5 text-white/30'
              : 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'
          }`}
          title={card.ability.description}
        >
          {pos.ability_used_this_turn ? '✓' : '⚡'} {card.ability.name}
        </button>
      )}
      {card.ability && isOpponent && (
        <div className="mt-1 text-[9px] text-white/30 text-center">
          {pos.is_face_down ? 'Hidden' : 'Has ability'}
        </div>
      )}

      {/* Attack/Target button */}
      {!isOpponent && !pos.ability_used_this_turn && card.ability && onSelectForAttack && (
        <button
          onClick={(e) => { e.stopPropagation(); onSelectForAttack() }}
          className="mt-1 text-[10px] px-1 py-0.5 rounded bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 font-medium"
        >
          ⚔️ Attack
        </button>
      )}
    </div>
  )
}

// ---- Mini Card for Hand ----
function CardMini({
  card, selected, onClick, affordable
}: {
  card: GameCard
  selected: boolean
  onClick: () => void
  affordable: boolean
}) {
  const rarityColor = RARITY_COLORS[card.rarity] || '#94a3b8'
  return (
    <div
      onClick={onClick}
      className={`game-card p-2 flex flex-col ${
        selected ? 'ring-2 ring-amber-400' : ''
      } ${!affordable ? 'opacity-50' : ''}`}
      style={{ borderColor: rarityColor, width: '120px', minHeight: '160px' }}
    >
      <div className="text-right text-xs">
        <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">
          ₱{card.cost}
        </span>
      </div>
      <div className="text-sm font-bold text-center text-white truncate">{card.name}</div>
      <div className="text-[10px] text-white/40 text-center mb-1 truncate">{card.title}</div>
      <div className="flex-1 space-y-0.5 mt-1">
        {[
          { label: 'C', val: card.stats.charisma, color: '#ff6b6b' },
          { label: 'M', val: card.stats.machinery, color: '#3b82f6' },
          { label: 'B', val: card.stats.budget, color: '#facc15' },
          { label: 'I', val: card.stats.influence, color: '#a855f7' },
        ].map((s) => (
          <div key={s.label} className="flex items-center gap-1">
            <span className="text-[9px] text-white/40 w-3">{s.label}</span>
            <div className="stat-bar flex-1">
              <div className="stat-bar-fill" style={{ width: `${(s.val / 10) * 100}%`, background: s.color }} />
            </div>
          </div>
        ))}
      </div>
      {card.ability && (
        <div className="mt-1 text-[9px] text-amber-300/70 text-center truncate" title={card.ability.description}>
          ⚡ {card.ability.name}
        </div>
      )}
    </div>
  )
}