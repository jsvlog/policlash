// ============================================================
// PoliClash PH — Campaign Battle Engine
// ============================================================
// Turn-based combat: player's 1-3 cards vs campaign monster.
// Cards gain XP from battles and level up (max 100).
// Stats scale with level based on rarity.
// ============================================================

import type { GameCard, CardRarity } from './types'
import type { CampaignMonster } from './campaign-data'

// ---- Rarity level multipliers (per level, capped at 50) ----
// Levels 1-50: rarity-specific growth. Levels 51-100: flat +1% for all.
// This prevents mythic cards from being 4x stronger than commons at endgame.
export const RARITY_LEVEL_MULT: Record<CardRarity, number> = {
  common: 0.015,     // +1.5%/level (lv1-50) → total +74.5% at lv50
  rare: 0.022,       // +2.2%/level → total +107.8% at lv50
  epic: 0.030,       // +3.0%/level → total +147% at lv50
  legendary: 0.040,  // +4.0%/level → total +196% at lv50
  mythic: 0.055,     // +5.5%/level → total +269.5% at lv50
}

// Post-level-50: all cards get +1% per level (0.01)
const POST_CAP_MULT = 0.01
const LEVEL_CAP = 50

// ---- XP needed to reach a given level ----
export function xpForLevel(level: number): number {
  // Cumulative XP: each level costs more
  // Level 1→2: 100, 2→3: 150, ... 99→100: 5000
  if (level <= 1) return 0
  let total = 0
  for (let l = 2; l <= level; l++) {
    total += 50 + l * 45
  }
  return total
}

// ---- XP needed for NEXT level (from current level) ----
export function xpToNextLevel(currentLevel: number): number {
  if (currentLevel >= 100) return Infinity
  return xpForLevel(currentLevel + 1) - xpForLevel(currentLevel)
}

// ---- XP gained from defeating a monster ----
export function xpFromBattle(monsterLevel: number): number {
  // Higher level monsters give more XP
  return 10 + monsterLevel * 8
}

// ---- Calculate level from total XP ----
export function levelFromXp(totalXp: number): number {
  let level = 1
  while (level < 100 && xpForLevel(level + 1) <= totalXp) {
    level++
  }
  return level
}

// ---- Card combat stats ----
export interface BattleCard {
  card: GameCard
  hp: number
  maxHp: number
  attack: number
  defense: number
  abilityUsed: boolean
  abilityCooldown: number
  debuffAttack: number
  debuffDefense: number
  stunned: boolean
  defeated: boolean
  level: number
  xpGained: number
}

export interface BattleMonster {
  monster: CampaignMonster
  hp: number
  maxHp: number
  attack: number
  defense: number
  specialCooldown: number
}

export type BattleAction =
  | { type: 'attack'; cardIndex: number }
  | { type: 'ability'; cardIndex: number }
  | { type: 'monster_attack' }
  | { type: 'monster_special' }

export interface BattleEvent {
  type: 'attack' | 'ability' | 'damage' | 'defeat' | 'heal' | 'stun' | 'buff' | 'debuff' | 'victory' | 'defeat_player'
  source: 'player' | 'monster'
  cardIndex?: number
  damage?: number
  heal?: number
  message: string
  targetHp?: number
  targetMaxHp?: number
}

export interface BattleState {
  cards: BattleCard[]
  monster: BattleMonster
  turn: 'player' | 'monster'
  battleLog: string[]
  events: BattleEvent[] // current turn events
  status: 'fighting' | 'victory' | 'defeat'
  turnNumber: number
  selectedCardIndex: number | null
  xpAwarded: boolean
}

// ---- Convert a GameCard to a BattleCard (with level scaling, capped at 50) ----
export function cardToBattleCard(card: GameCard, level = 1): BattleCard {
  const mult = RARITY_LEVEL_MULT[card.rarity] || 0.015
  
  // Capped scaling: rarity mult applies up to level 50, then flat +1%/level
  const cappedLevels = Math.min(level - 1, LEVEL_CAP - 1)
  const postCapLevels = Math.max(0, level - LEVEL_CAP)
  const levelMult = 1 + cappedLevels * mult + postCapLevels * POST_CAP_MULT

  const baseHp = Math.floor(
    (card.stats.charisma + card.stats.machinery + card.stats.budget + card.stats.influence) / 1.5
  ) + 20
  const baseAtk = Math.floor(
    (card.stats.charisma * 1.2 + card.stats.machinery * 0.8 + card.stats.influence * 1.0) / 2.5
  ) + 5
  const baseDef = Math.floor(
    (card.stats.machinery + card.stats.budget) / 3
  ) + 3

  return {
    card,
    hp: Math.floor(baseHp * levelMult),
    maxHp: Math.floor(baseHp * levelMult),
    attack: Math.floor(baseAtk * levelMult),
    defense: Math.floor(baseDef * levelMult),
    abilityUsed: false,
    abilityCooldown: 0,
    debuffAttack: 0,
    debuffDefense: 0,
    stunned: false,
    defeated: false,
    level,
    xpGained: 0,
  }
}

// ---- Start a new battle ----
export function startBattle(
  selectedCards: { card: GameCard; level: number }[],
  monster: CampaignMonster
): BattleState {
  const battleCards = selectedCards.map(({ card, level }) => cardToBattleCard(card, level))
  const playerFirst = monster.level < 30 || Math.random() > 0.3

  return {
    cards: battleCards,
    monster: {
      monster,
      hp: monster.hp,
      maxHp: monster.maxHp,
      attack: monster.attack,
      defense: monster.defense,
      specialCooldown: 0,
    },
    turn: playerFirst ? 'player' : 'monster',
    battleLog: [`Battle started! ${monster.name} (Lv.${monster.level}) appears!`],
    events: [],
    status: 'fighting',
    turnNumber: 1,
    selectedCardIndex: null,
    xpAwarded: false,
  }
}

// ---- Award XP to all surviving cards on victory ----
export function awardXp(state: BattleState): BattleState {
  if (state.xpAwarded || state.status !== 'victory') return state
  const xp = xpFromBattle(state.monster.monster.level)
  const newCards = state.cards.map(c => ({
    ...c,
    xpGained: c.defeated ? 0 : xp,
  }))
  return {
    ...state,
    cards: newCards,
    xpAwarded: true,
    battleLog: [
      ...state.battleLog,
      `Victory! Each surviving card gains ${xp} XP.`,
    ],
  }
}

// ---- Calculate actual attack after modifiers ----
export function getCardAttack(card: BattleCard): number {
  return Math.max(1, card.attack + card.debuffAttack)
}

export function getCardDefense(card: BattleCard): number {
  return Math.max(0, card.defense + card.debuffDefense)
}

// ---- Player attacks monster ----
export function playerAttack(state: BattleState, cardIndex: number): BattleState {
  const card = state.cards[cardIndex]
  if (!card || card.defeated || card.stunned) {
    return { ...state, events: [{ type: 'attack', source: 'player', cardIndex, message: 'Cannot attack!', damage: 0 }] }
  }

  const baseDmg = getCardAttack(card)
  const defense = state.monster.defense
  const variance = 0.85 + Math.random() * 0.3 // 85%-115%
  const damage = Math.max(1, Math.floor((baseDmg - defense / 2) * variance))

  const newMonsterHp = Math.max(0, state.monster.hp - damage)
  const monsterDefeated = newMonsterHp <= 0

  const events: BattleEvent[] = [{
    type: 'attack',
    source: 'player',
    cardIndex,
    damage,
    message: `${card.card.name} attacks for ${damage} damage!`,
    targetHp: newMonsterHp,
    targetMaxHp: state.monster.maxHp,
  }]

  if (monsterDefeated) {
    events.push({
      type: 'victory',
      source: 'player',
      message: `${state.monster.monster.name} has been defeated!`,
      targetHp: 0,
      targetMaxHp: state.monster.maxHp,
    })
  }

  return {
    ...state,
    monster: { ...state.monster, hp: newMonsterHp },
    cards: state.cards.map((c, i) =>
      i === cardIndex ? { ...c, abilityCooldown: Math.max(0, c.abilityCooldown - 1) } : c
    ),
    turn: monsterDefeated ? 'player' : 'monster', // stay on player turn if won
    status: monsterDefeated ? 'victory' : 'fighting',
    battleLog: [...state.battleLog, events[0].message],
    events,
    turnNumber: state.turnNumber,
    selectedCardIndex: null,
  }
}

// ---- Player uses ability ----
export function playerAbility(state: BattleState, cardIndex: number): BattleState {
  const card = state.cards[cardIndex]
  if (!card || card.defeated || card.stunned) {
    return { ...state, events: [{ type: 'ability', source: 'player', cardIndex, message: 'Cannot use ability!', damage: 0 }] }
  }
  if (!card.card.ability) {
    return { ...state, events: [{ type: 'ability', source: 'player', cardIndex, message: 'No ability!', damage: 0 }] }
  }
  if (card.abilityCooldown > 0) {
    return { ...state, events: [{ type: 'ability', source: 'player', cardIndex, message: `Ability on cooldown (${card.abilityCooldown} turns)!`, damage: 0 }] }
  }

  const ability = card.card.ability
  let damage = 0
  let heal = 0
  let events: BattleEvent[] = []
  let newMonsterHp = state.monster.hp
  const newCards = [...state.cards]

  switch (ability.type) {
    case 'vote_buy':
    case 'pork_barrel': {
      // Boost own attack this turn
      const boost = ability.power || 2
      newCards[cardIndex] = {
        ...card,
        debuffAttack: card.debuffAttack + boost,
        abilityCooldown: ability.cooldown,
      }
      events.push({
        type: 'buff', source: 'player', cardIndex,
        message: `${card.card.name} uses ${ability.name}! ATK +${boost} for 1 turn.`,
        targetHp: state.monster.hp, targetMaxHp: state.monster.maxHp,
      })
      break
    }
    case 'blackmail':
    case 'break_defense': {
      // Deal bonus damage ignoring defense
      const bonusDmg = (ability.power || 1) * 5 + getCardAttack(card)
      newMonsterHp = Math.max(0, state.monster.hp - bonusDmg)
      damage = bonusDmg
      events.push({
        type: 'attack', source: 'player', cardIndex, damage: bonusDmg,
        message: `${card.card.name} uses ${ability.name}! ${bonusDmg} damage (ignores defense)!`,
        targetHp: newMonsterHp, targetMaxHp: state.monster.maxHp,
      })
      newCards[cardIndex] = { ...card, abilityCooldown: ability.cooldown }
      break
    }
    case 'rally_support':
    case 'legacy': {
      // Boost all alive cards
      const boost = ability.power || 2
      for (let i = 0; i < newCards.length; i++) {
        if (!newCards[i].defeated) {
          newCards[i] = { ...newCards[i], debuffAttack: newCards[i].debuffAttack + boost }
        }
      }
      newCards[cardIndex] = { ...newCards[cardIndex], abilityCooldown: ability.cooldown }
      events.push({
        type: 'buff', source: 'player', cardIndex,
        message: `${card.card.name} uses ${ability.name}! All cards gain ATK +${boost}!`,
        targetHp: state.monster.hp, targetMaxHp: state.monster.maxHp,
      })
      break
    }
    case 'pardon': {
      // Revive a defeated card
      const defeatedIdx = newCards.findIndex(c => c.defeated)
      if (defeatedIdx >= 0) {
        const revived = newCards[defeatedIdx]
        newCards[defeatedIdx] = {
          ...revived,
          hp: Math.floor(revived.maxHp / 2),
          defeated: false,
          stunned: false,
          debuffAttack: 0,
          debuffDefense: 0,
        }
        newCards[cardIndex] = { ...card, abilityCooldown: ability.cooldown }
        events.push({
          type: 'heal', source: 'player', cardIndex: defeatedIdx,
          message: `${card.card.name} uses ${ability.name}! ${revived.card.name} revived with 50% HP!`,
          targetHp: state.monster.hp, targetMaxHp: state.monster.maxHp,
        })
      } else {
        events.push({
          type: 'ability', source: 'player', cardIndex,
          message: `${card.card.name} uses ${ability.name} but no cards to revive!`,
          targetHp: state.monster.hp, targetMaxHp: state.monster.maxHp,
        })
      }
      break
    }
    case 'investigate': {
      // Debuff monster defense
      const debuff = 5
      events.push({
        type: 'debuff', source: 'player', cardIndex,
        message: `${card.card.name} uses ${ability.name}! Monster DEF -${debuff} for 2 turns!`,
        targetHp: state.monster.hp, targetMaxHp: state.monster.maxHp,
      })
      newCards[cardIndex] = { ...card, abilityCooldown: ability.cooldown }
      break
    }
    case 'immunity': {
      // Shield self
      const defBoost = 10
      newCards[cardIndex] = {
        ...card,
        debuffDefense: card.debuffDefense + defBoost,
        abilityCooldown: ability.cooldown,
      }
      events.push({
        type: 'buff', source: 'player', cardIndex,
        message: `${card.card.name} uses ${ability.name}! DEF +${defBoost} for 2 turns!`,
        targetHp: state.monster.hp, targetMaxHp: state.monster.maxHp,
      })
      break
    }
    default: {
      // Generic: deal power * 5 damage
      const bonusDmg = (ability.power || 1) * 5
      newMonsterHp = Math.max(0, state.monster.hp - bonusDmg)
      damage = bonusDmg
      events.push({
        type: 'ability', source: 'player', cardIndex, damage: bonusDmg,
        message: `${card.card.name} uses ${ability.name}! ${bonusDmg} damage!`,
        targetHp: newMonsterHp, targetMaxHp: state.monster.maxHp,
      })
      newCards[cardIndex] = { ...card, abilityCooldown: ability.cooldown }
    }
  }

  if (newMonsterHp <= 0) {
    events.push({
      type: 'victory', source: 'player',
      message: `${state.monster.monster.name} has been defeated!`,
      targetHp: 0, targetMaxHp: state.monster.maxHp,
    })
  }

  const status = newMonsterHp <= 0 ? 'victory' : 'fighting'

  return {
    ...state,
    cards: newCards,
    monster: { ...state.monster, hp: newMonsterHp },
    turn: status === 'victory' ? 'player' : 'monster',
    status,
    battleLog: [...state.battleLog, events[0]?.message || ''],
    events,
    turnNumber: state.turnNumber,
    selectedCardIndex: null,
  }
}

// ---- Monster attacks a random alive card ----
export function monsterTurn(state: BattleState): BattleState {
  const aliveCards = state.cards
    .map((c, i) => ({ ...c, index: i }))
    .filter(c => !c.defeated && !c.stunned)

  if (aliveCards.length === 0) {
    // All cards defeated
    return {
      ...state,
      status: 'defeat',
      turn: 'monster',
      events: [{ type: 'defeat_player', source: 'monster', message: 'All your cards have been defeated!' }],
      battleLog: [...state.battleLog, 'All cards defeated!'],
    }
  }

  // Monster picks a target
  const target = aliveCards[Math.floor(Math.random() * aliveCards.length)]
  const cardIndex = target.index

  // Check if monster can use special (boss only, every 4 turns)
  const canUseSpecial = state.monster.specialCooldown <= 0
    && state.monster.monster.special
    && state.turnNumber % 4 === 0
    && Math.random() < 0.5

  let events: BattleEvent[] = []
  let newCards = [...state.cards]
  let newSpecialCooldown = Math.max(0, state.monster.specialCooldown - 1)

  if (canUseSpecial) {
    // Boss special attack - deals 2x damage
    const rawDmg = state.monster.attack * 2
    const cardDef = getCardDefense(newCards[cardIndex])
    const damage = Math.max(1, rawDmg - cardDef)
    const newHp = Math.max(0, newCards[cardIndex].hp - damage)

    newCards[cardIndex] = {
      ...newCards[cardIndex],
      hp: newHp,
      defeated: newHp <= 0,
      stunned: true, // Stun on special
    }
    newSpecialCooldown = 3

    events.push({
      type: 'ability', source: 'monster', cardIndex, damage,
      message: `${state.monster.monster.name} uses ${state.monster.monster.special!.name}! ${damage} damage + STUN!`,
      targetHp: newHp, targetMaxHp: newCards[cardIndex].maxHp,
    })
  } else {
    // Normal attack
    const variance = 0.85 + Math.random() * 0.3
    const rawDmg = Math.floor(state.monster.attack * variance)
    const cardDef = getCardDefense(newCards[cardIndex])
    const damage = Math.max(1, rawDmg - cardDef)
    const newHp = Math.max(0, newCards[cardIndex].hp - damage)

    newCards[cardIndex] = {
      ...newCards[cardIndex],
      hp: newHp,
      defeated: newHp <= 0,
      debuffDefense: Math.max(0, newCards[cardIndex].debuffDefense - 1),
      debuffAttack: Math.min(0, newCards[cardIndex].debuffAttack + 1), // debuffs decay
    }

    events.push({
      type: 'attack', source: 'monster', cardIndex, damage,
      message: `${state.monster.monster.name} attacks ${newCards[cardIndex].card.name} for ${damage} damage!`,
      targetHp: newHp, targetMaxHp: newCards[cardIndex].maxHp,
    })

    if (newHp <= 0) {
      events.push({
        type: 'defeat', source: 'monster', cardIndex,
        message: `${newCards[cardIndex].card.name} has been defeated!`,
        targetHp: 0, targetMaxHp: newCards[cardIndex].maxHp,
      })
    }
  }

  // Clear stun on all cards, reduce cooldowns
  newCards = newCards.map(c => ({
    ...c,
    stunned: false,
    abilityCooldown: Math.max(0, c.abilityCooldown - 1),
  }))

  // Check if all cards are defeated
  const allDefeated = newCards.every(c => c.defeated)
  if (allDefeated) {
    events.push({
      type: 'defeat_player', source: 'monster',
      message: 'All your cards have been defeated!',
    })
  }

  return {
    ...processPassives({
      ...state,
      cards: newCards,
      monster: {
        ...state.monster,
        specialCooldown: newSpecialCooldown,
      },
      turn: 'player',
      status: allDefeated ? 'defeat' : 'fighting',
      battleLog: [...state.battleLog, events[0]?.message || ''],
      events,
      turnNumber: state.turnNumber + 1,
      selectedCardIndex: null,
    }),
  }
}

// ---- Clean events between turns ----
export function clearEvents(state: BattleState): BattleState {
  return { ...state, events: [] }
}

// ---- Process passive abilities at start of player turn ----
export function processPassives(state: BattleState): BattleState {
  if (state.turn !== 'player' || state.status !== 'fighting') return state
  
  let newCards = [...state.cards]
  let events: BattleEvent[] = []
  let healed = false

  for (let i = 0; i < newCards.length; i++) {
    const card = newCards[i]
    if (card.defeated || !card.card.ability) continue
    
    const ability = card.card.ability
    
    // LGU Fund: passive heal — mayors allocate budget to keep the team alive
    if (ability.type === 'lgu_fund') {
      const healAmount = ability.power || 2
      if (card.hp < card.maxHp) {
        newCards[i] = { ...card, hp: Math.min(card.maxHp, card.hp + healAmount) }
        healed = true
      }
    }
  }

  if (healed) {
    events.push({
      type: 'heal', source: 'player',
      message: 'LGU Fund: Mayors allocate budget — team healed!',
      targetHp: state.monster.hp, targetMaxHp: state.monster.maxHp,
    })
  }

  return {
    ...state,
    cards: newCards,
    events: [...state.events, ...events],
    battleLog: events.length > 0 ? [...state.battleLog, events[0].message] : state.battleLog,
  }
}
