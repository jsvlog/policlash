// ============================================================
// PoliClash PH — Game Logic Engine
// ============================================================
import type {
  GameState, GameCard, PlayerState, BoardPosition,
  CardAbility, CardStats, CardRarity
} from './types'
import { STARTER_CARDS, AI_OPPONENT_DECKS, RARITY_COLORS } from './card-data'

const BOARD_SIZE = 5
const STARTING_HEALTH = 30
const STARTING_HAND_SIZE = 4
const MAX_HAND_SIZE = 8
const BUDGET_PER_TURN = 4

// ---- Create a new game state ----
export function createNewGame(
  playerDeck: GameCard[],
  difficulty: 'easy' | 'medium' | 'hard' = 'easy'
): GameState {
  const playerHand = playerDeck.slice(0, STARTING_HAND_SIZE)
  const playerDeckRemaining = playerDeck.slice(STARTING_HAND_SIZE)

  const aiDeck = [...(AI_OPPONENT_DECKS[difficulty] || AI_OPPONENT_DECKS.easy)]
  const aiHand = aiDeck.slice(0, STARTING_HAND_SIZE)
  const aiDeckRemaining = aiDeck.slice(STARTING_HAND_SIZE)

  return {
    id: crypto.randomUUID(),
    current_turn: 'player',
    turn_number: 1,
    player: {
      id: 'player',
      name: 'You',
      health: STARTING_HEALTH,
      budget_pool: BUDGET_PER_TURN,
      hand: playerHand,
      board: Array(BOARD_SIZE).fill(null).map(() => ({
        card: null, is_face_down: false,
        ability_used_this_turn: false, immunity_active: false,
        temporary_buffs: {}
      })),
      deck: playerDeckRemaining,
      graveyard: [],
    },
    opponent: {
      id: 'opponent',
      name: 'AI Trapo',
      health: STARTING_HEALTH,
      budget_pool: BUDGET_PER_TURN,
      hand: aiHand,
      board: Array(BOARD_SIZE).fill(null).map(() => ({
        card: null, is_face_down: false,
        ability_used_this_turn: false, immunity_active: false,
        temporary_buffs: {}
      })),
      deck: aiDeckRemaining,
      graveyard: [],
    },
    log: ['Game started! Your turn.'],
    status: 'ongoing',
  }
}

// ---- Get effective stats (with temporary buffs) ----
export function getEffectiveStats(pos: BoardPosition): CardStats {
  if (!pos.card) return { charisma: 0, machinery: 0, budget: 0, influence: 0 }
  const s = pos.card.stats
  const b = pos.temporary_buffs
  return {
    charisma: s.charisma + (b.charisma || 0),
    machinery: s.machinery + (b.machinery || 0),
    budget: s.budget + (b.budget || 0),
    influence: s.influence + (b.influence || 0),
  }
}

// ---- Play a card from hand to board ----
export function playCard(
  state: GameState,
  handIndex: number,
  boardIndex: number
): GameState {
  if (state.current_turn !== 'player') return state
  if (boardIndex < 0 || boardIndex >= BOARD_SIZE) return state

  const player = { ...state.player }
  const card = player.hand[handIndex]
  if (!card) return state
  if (player.budget_pool < card.cost) {
    return { ...state, log: [...state.log, 'Not enough budget!'] }
  }
  if (player.board[boardIndex].card) {
    return { ...state, log: [...state.log, 'Board position occupied!'] }
  }

  player.budget_pool -= card.cost
  player.hand = player.hand.filter((_, i) => i !== handIndex)
  player.board = player.board.map((pos, i) =>
    i === boardIndex
      ? { card, is_face_down: false, ability_used_this_turn: false, immunity_active: false, temporary_buffs: {} }
      : pos
  )

  // Trigger on_play abilities
  if (card.ability?.trigger === 'on_play') {
    const ability = card.ability
    if (ability.type === 'pork_barrel') {
      player.budget_pool += ability.power
    }
  }

  return {
    ...state,
    player,
    log: [...state.log, `Played ${card.name} (cost ${card.cost}).`],
  }
}

// ---- Use card ability ----
export function useAbility(
  state: GameState,
  boardIndex: number
): GameState {
  if (state.current_turn !== 'player') return state
  const player = { ...state.player }
  const opponent = { ...state.opponent }
  const pos = player.board[boardIndex]
  if (!pos?.card || !pos.card.ability) return state
  if (pos.ability_used_this_turn) {
    return { ...state, log: [...state.log, 'Ability already used this turn!'] }
  }

  const ability = pos.card.ability
  let log = [...state.log, `Used ${ability.name}!`]

  switch (ability.type) {
    case 'rally_support': {
      player.board = player.board.map((p) =>
        p.card
          ? { ...p, temporary_buffs: { ...p.temporary_buffs, charisma: (p.temporary_buffs.charisma || 0) + ability.power } }
          : p
      )
      log.push(`All allies gained +${ability.power} Charisma!`)
      break
    }
    case 'break_defense': {
      log.push('Next attack will ignore enemy defense!')
      break
    }
    case 'vote_buy': {
      player.board = player.board.map((p, i) =>
        i === boardIndex
          ? {
              ...p,
              temporary_buffs: {
                charisma: (p.temporary_buffs.charisma || 0) + ability.power,
                machinery: (p.temporary_buffs.machinery || 0) + ability.power,
                budget: (p.temporary_buffs.budget || 0) + ability.power,
                influence: (p.temporary_buffs.influence || 0) + ability.power,
              }
            }
          : p
      )
      log.push(`+${ability.power} to all stats!`)
      break
    }
    case 'pork_barrel': {
      player.budget_pool += ability.power
      log.push(`+${ability.power} budget!`)
      break
    }
    case 'investigate': {
      opponent.board = opponent.board.map((p) => ({ ...p, is_face_down: false }))
      log.push('Enemy cards revealed!')
      break
    }
    case 'immunity': {
      player.board = player.board.map((p, i) =>
        i === boardIndex ? { ...p, immunity_active: true } : p
      )
      log.push(`${pos.card.name} is immune for ${ability.power} turns!`)
      break
    }
    case 'blackmail': {
      // Destroy enemy card with lowest influence
      let lowestIdx = -1
      let lowestVal = Infinity
      opponent.board.forEach((p, i) => {
        if (p.card && !p.immunity_active) {
          const inf = getEffectiveStats(p).influence
          if (inf < lowestVal) { lowestVal = inf; lowestIdx = i }
        }
      })
      if (lowestIdx >= 0) {
        const destroyed = opponent.board[lowestIdx].card
        opponent.graveyard = [...opponent.graveyard, destroyed!]
        opponent.board = opponent.board.map((p, i) =>
          i === lowestIdx ? { card: null, is_face_down: false, ability_used_this_turn: false, immunity_active: false, temporary_buffs: {} } : p
        )
        log.push(`Destroyed ${destroyed!.name}!`)
      } else {
        log.push('No valid target!')
      }
      break
    }
    case 'pardon': {
      // Revive last destroyed ally
      if (player.graveyard.length > 0) {
        const revived = player.graveyard[player.graveyard.length - 1]
        player.graveyard = player.graveyard.slice(0, -1)
        player.hand = [...player.hand, revived].slice(0, MAX_HAND_SIZE)
        log.push(`Revived ${revived.name}!`)
      } else {
        log.push('No cards in graveyard!')
      }
      break
    }
    default:
      log.push(`${ability.name} activated!`)
  }

  player.board = player.board.map((p, i) =>
    i === boardIndex ? { ...p, ability_used_this_turn: true } : p
  )

  return { ...state, player, opponent, log }
}

// ---- Attack with a card ----
export function attack(
  state: GameState,
  attackerBoardIdx: number,
  targetBoardIdx: number // -1 = attack opponent directly
): GameState {
  if (state.current_turn !== 'player') return state

  const player = { ...state.player }
  const opponent = { ...state.opponent }
  const attacker = player.board[attackerBoardIdx]
  if (!attacker?.card) return state

  const atkStats = getEffectiveStats(attacker)
  const attackPower = atkStats.charisma + atkStats.machinery

  let log = [...state.log]

  if (targetBoardIdx === -1) {
    // Direct attack on opponent
    const damage = attackPower
    opponent.health = Math.max(0, opponent.health - damage)
    log.push(`${attacker.card.name} attacks directly for ${damage}!`)

    // Check win
    if (opponent.health <= 0) {
      return { ...state, opponent, log: [...log, 'YOU WIN!'], status: 'player_win' }
    }
  } else {
    const target = opponent.board[targetBoardIdx]
    if (!target?.card) {
      log.push('No target at that position!')
      return { ...state, log }
    }
    if (target.immunity_active) {
      log.push(`${target.card.name} is immune!`)
      return { ...state, log }
    }

    const defStats = getEffectiveStats(target)
    const defensePower = defStats.influence + defStats.budget
    const damage = Math.max(1, attackPower - Math.floor(defensePower / 2))

    log.push(`${attacker.card.name} attacks ${target.card.name} for ${damage}!`)

    // Destroy target if attack power > defense
    if (attackPower > defensePower) {
      // Trigger on_destroy abilities
      if (target.card.ability?.trigger === 'on_destroy' && target.card.ability.type === 'legacy') {
        opponent.board = opponent.board.map((p, i) => {
          if (Math.abs(i - targetBoardIdx) === 1 && p.card) {
            return { ...p, temporary_buffs: { ...p.temporary_buffs, influence: (p.temporary_buffs.influence || 0) + target.card.ability!.power } }
          }
          return p
        })
        log.push(`${target.card.name}'s Family Legacy: adjacent allies +${target.card.ability.power} Influence`)
      }
      opponent.graveyard = [...opponent.graveyard, target.card!]
      opponent.board = opponent.board.map((p, i) =>
        i === targetBoardIdx ? { card: null, is_face_down: false, ability_used_this_turn: false, immunity_active: false, temporary_buffs: {} } : p
      )
      log.push(`${target.card.name} destroyed!`)
    }
  }

  return { ...state, player, opponent, log }
}

// ---- End turn ----
export function endTurn(state: GameState): GameState {
  // Clear temporary buffs and reset ability flags
  const clearPlayer = (p: PlayerState): PlayerState => ({
    ...p,
    board: p.board.map((pos) => ({
      ...pos,
      ability_used_this_turn: false,
      temporary_buffs: {},
    })),
  })

  let newState: GameState = {
    ...state,
    player: clearPlayer(state.player),
    opponent: clearPlayer(state.opponent),
  }

  // Switch turn
  const isPlayerTurn = state.current_turn === 'player'
  newState.current_turn = isPlayerTurn ? 'opponent' : 'player'
  newState.turn_number += 1

  // Give budget to the active player
  if (newState.current_turn === 'player') {
    newState.player = {
      ...newState.player,
      budget_pool: newState.player.budget_pool + BUDGET_PER_TURN,
    }
    // Draw a card
    if (newState.player.deck.length > 0 && newState.player.hand.length < MAX_HAND_SIZE) {
      const drawn = newState.player.deck[0]
      newState.player = {
        ...newState.player,
        hand: [...newState.player.hand, drawn],
        deck: newState.player.deck.slice(1),
      }
      newState.log = [...newState.log, `Drew ${drawn.name}.`]
    }
    newState.log = [...newState.log, 'Your turn.']
  } else {
    newState.opponent = {
      ...newState.opponent,
      budget_pool: newState.opponent.budget_pool + BUDGET_PER_TURN,
    }
    if (newState.opponent.deck.length > 0 && newState.opponent.hand.length < MAX_HAND_SIZE) {
      const drawn = newState.opponent.deck[0]
      newState.opponent = {
        ...newState.opponent,
        hand: [...newState.opponent.hand, drawn],
        deck: newState.opponent.deck.slice(1),
      }
    }
    newState.log = [...newState.log, "Opponent's turn."]
    // Execute AI move
    newState = executeAITurn(newState)
  }

  return newState
}

// ---- AI Turn Logic ----
function executeAITurn(state: GameState): GameState {
  let s = { ...state }
  const opponent = { ...s.opponent }

  // 1. Play cards from hand
  const handCopy = [...opponent.hand]
  for (let i = handCopy.length - 1; i >= 0; i--) {
    const card = handCopy[i]
    if (opponent.budget_pool >= card.cost) {
      // Find empty board slot
      const emptySlot = opponent.board.findIndex((p) => !p.card)
      if (emptySlot >= 0) {
        opponent.budget_pool -= card.cost
        opponent.hand = opponent.hand.filter((_, idx) => idx !== i)
        opponent.board = opponent.board.map((pos, bi) =>
          bi === emptySlot
            ? { card, is_face_down: false, ability_used_this_turn: false, immunity_active: false, temporary_buffs: {} }
            : pos
        )
        // Trigger on_play
        if (card.ability?.trigger === 'on_play' && card.ability.type === 'pork_barrel') {
          opponent.budget_pool += card.ability.power
        }
        s.log = [...s.log, `Opponent played ${card.name}.`]
      }
    }
  }

  // 2. Use abilities
  opponent.board.forEach((pos, i) => {
    if (pos.card?.ability && !pos.ability_used_this_turn) {
      if (pos.card.ability.type === 'rally_support') {
        opponent.board = opponent.board.map((p) =>
          p.card ? { ...p, temporary_buffs: { ...p.temporary_buffs, charisma: (p.temporary_buffs.charisma || 0) + pos.card!.ability!.power } } : p
        )
        opponent.board[i].ability_used_this_turn = true
        s.log = [...s.log, `Opponent used ${pos.card.ability.name}!`]
      }
    }
  })

  // 3. Attack
  const player = { ...s.player }
  opponent.board.forEach((pos, i) => {
    if (!pos.card) return
    const atkStats = getEffectiveStats(pos)
    const attackPower = atkStats.charisma + atkStats.machinery

    // Find target: player card with highest influence, or direct if no cards
    let bestTarget = -1
    let bestInfluence = -1
    player.board.forEach((p, j) => {
      if (p.card && !p.immunity_active) {
        const inf = getEffectiveStats(p).influence
        if (inf > bestInfluence) { bestInfluence = inf; bestTarget = j }
      }
    })

    if (bestTarget >= 0) {
      const target = player.board[bestTarget]
      const defStats = getEffectiveStats(target)
      const defensePower = defStats.influence + defStats.budget
      const damage = Math.max(1, attackPower - Math.floor(defensePower / 2))
      if (attackPower > defensePower) {
        player.graveyard = [...player.graveyard, target.card!]
        player.board = player.board.map((p, j) =>
          j === bestTarget ? { card: null, is_face_down: false, ability_used_this_turn: false, immunity_active: false, temporary_buffs: {} } : p
        )
        s.log = [...s.log, `Opponent's ${pos.card.name} destroyed your ${target.card.name}!`]
      } else {
        s.log = [...s.log, `Opponent's ${pos.card.name} attacked ${target.card.name} for ${damage}.`]
      }
    } else {
      player.health = Math.max(0, player.health - attackPower)
      s.log = [...s.log, `Opponent's ${pos.card.name} attacks directly for ${attackPower}!`]
      if (player.health <= 0) {
        s.status = 'opponent_win'
        s.log = [...s.log, 'YOU LOSE!']
      }
    }
  })

  s.opponent = opponent
  s.player = player
  return s
}

// ---- Get card color for rarity ----
export function getRarityColor(rarity: CardRarity): string {
  return RARITY_COLORS[rarity] || '#94a3b8'
}

// ---- Check if game is over ----
export function isGameOver(state: GameState): boolean {
  return state.status !== 'ongoing'
}

// ---- Get player deck (default starter) ----
export function getDefaultPlayerDeck(): GameCard[] {
  return [...STARTER_CARDS.slice(0, 8)]
}