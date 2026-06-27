// ============================================================
// PoliClash PH — Campaign Data (100 Maps × 10 Stages)
// ============================================================
// Monsters are procedurally generated based on map + stage.
// Each map has a theme that affects monster names and flavor.
// ============================================================

export interface CampaignMonster {
  id: string
  name: string
  title: string
  hp: number
  maxHp: number
  attack: number
  defense: number
  level: number
  faction: string
  emoji: string
  flavor: string
  special?: { name: string; description: string; cooldown: number }
}

export interface CampaignStage {
  mapId: number
  stageId: number
  monster: CampaignMonster
  rewardCoins: number
  unlocked: boolean
}

export interface CampaignMap {
  id: number
  name: string
  description: string
  theme: string
  emoji: string
  color: string
  monsterPrefix: string
  stages: number // always 10
}

// ---- Map Themes (100 maps organized into 10 regions × 10 maps each) ----
const MAP_THEMES: Omit<CampaignMap, 'id' | 'stages'>[] = [
  // Region 1: Barangay Battlegrounds (maps 1-10)
  { name: 'Barangay 143', description: 'Where it all begins — the smallest political unit.', theme: 'barangay', emoji: '🏘️', color: '#22c55e', monsterPrefix: 'Barangay' },
  { name: 'Sitio Struggle', description: 'Deeper into the barangay — sitio-level disputes.', theme: 'barangay', emoji: '🏚️', color: '#16a34a', monsterPrefix: 'Sitio' },
  { name: 'SK Hall Showdown', description: 'Youth politics at its finest.', theme: 'barangay', emoji: '🏫', color: '#15803d', monsterPrefix: 'SK' },
  { name: 'Tanod Territory', description: 'The barangay tanods are not happy.', theme: 'barangay', emoji: '🛡️', color: '#166534', monsterPrefix: 'Tanod' },
  { name: 'Plaza Politics', description: 'Where the tsismis flows like water.', theme: 'barangay', emoji: '🌳', color: '#65a30d', monsterPrefix: 'Tsismosa' },
  { name: 'Barangay Hall Siege', description: 'The captain has barricaded himself inside.', theme: 'barangay', emoji: '🏢', color: '#4d7c0f', monsterPrefix: 'Kapitan' },
  { name: 'Purok Pandemonium', description: 'All seven puroks are in chaos.', theme: 'barangay', emoji: '🏠', color: '#3f6212', monsterPrefix: 'Purok' },
  { name: 'Fiesta Fury', description: 'The annual fiesta has turned into a political rally.', theme: 'barangay', emoji: '🎉', color: '#84cc16', monsterPrefix: 'Fiesta' },
  { name: 'Barangay Election', description: 'Election day at the grassroots.', theme: 'barangay', emoji: '🗳️', color: '#a3e635', monsterPrefix: 'Kandidato' },
  { name: 'Barangay Boss', description: 'The final barangay challenge.', theme: 'barangay', emoji: '👑', color: '#fbbf24', monsterPrefix: 'BOSS' },

  // Region 2: City Hall Chaos (maps 11-20)
  { name: 'City Hall Lobby', description: 'Navigating the bureaucratic maze.', theme: 'city', emoji: '🏛️', color: '#f97316', monsterPrefix: 'Clerk' },
  { name: 'Red Tape Maze', description: 'So much paperwork, so little time.', theme: 'city', emoji: '📋', color: '#ea580c', monsterPrefix: 'Bureaucrat' },
  { name: 'Permit Office', description: 'Good luck getting that business permit.', theme: 'city', emoji: '📄', color: '#c2410c', monsterPrefix: 'Permit' },
  { name: 'Traffic Enforcer Alley', description: 'No ticket, no passage.', theme: 'city', emoji: '🚦', color: '#9a3412', monsterPrefix: 'Enforcer' },
  { name: 'Session Hall Brawl', description: 'The city council is in session — literally.', theme: 'city', emoji: '🔥', color: '#7c2d12', monsterPrefix: 'Konsehal' },
  { name: 'Vice Mayor Vault', description: 'The vice mayor guards the budget.', theme: 'city', emoji: '💰', color: '#f59e0b', monsterPrefix: 'Vice' },
  { name: 'Bidding Wars', description: 'Government procurement gone wrong.', theme: 'city', emoji: '⚔️', color: '#d97706', monsterPrefix: 'Contractor' },
  { name: 'COA Audit Arena', description: 'The auditors have arrived.', theme: 'city', emoji: '🔍', color: '#b45309', monsterPrefix: 'Auditor' },
  { name: 'City Jailbreak', description: 'Political prisoners on the loose.', theme: 'city', emoji: '🔓', color: '#92400e', monsterPrefix: 'Prisoner' },
  { name: 'Mayoral Mansion', description: 'The mayor awaits at the penthouse.', theme: 'city', emoji: '🏰', color: '#ef4444', monsterPrefix: 'BOSS' },

  // Region 3: Provincial Power (maps 21-30)
  { name: 'Capitol Gates', description: 'The provincial capitol stands before you.', theme: 'provincial', emoji: '⛩️', color: '#8b5cf6', monsterPrefix: 'Guard' },
  { name: 'Capitol Corridors', description: 'Long hallways, longer politics.', theme: 'provincial', emoji: '🚪', color: '#7c3aed', monsterPrefix: 'Staffer' },
  { name: 'Budget Hearing', description: 'Defend your budget or lose it all.', theme: 'provincial', emoji: '📊', color: '#6d28d9', monsterPrefix: 'Board' },
  { name: 'Provincial Jail', description: 'Political detainees await.', theme: 'provincial', emoji: '🔒', color: '#5b21b6', monsterPrefix: 'Detainee' },
  { name: 'SP Session', description: 'The Sangguniang Panlalawigan is in order... or not.', theme: 'provincial', emoji: '🏛️', color: '#4c1d95', monsterPrefix: 'Board' },
  { name: 'Governor\'s Wing', description: 'The governor\'s inner circle.', theme: 'provincial', emoji: '🪶', color: '#3b0764', monsterPrefix: 'Adviser' },
  { name: 'Provincial Hospital', description: 'Healthcare politics — life and death.', theme: 'provincial', emoji: '🏥', color: '#a855f7', monsterPrefix: 'Doctor' },
  { name: 'Capitol Rooftop', description: 'The final stand atop the capitol.', theme: 'provincial', emoji: '🌅', color: '#9333ea', monsterPrefix: 'Elite' },
  { name: 'Provincial Election', description: 'The entire province is watching.', theme: 'provincial', emoji: '🗳️', color: '#7e22ce', monsterPrefix: 'Kandidato' },
  { name: 'Governor\'s Throne', description: 'The governor himself.', theme: 'provincial', emoji: '👑', color: '#dc2626', monsterPrefix: 'BOSS' },

  // Region 4: Congressional Colosseum (maps 31-40)
  { name: 'House Gates', description: 'The House of Representatives.', theme: 'congress', emoji: '🏛️', color: '#06b6d4', monsterPrefix: 'Clerk' },
  { name: 'Committee Room', description: 'Endless committee hearings.', theme: 'congress', emoji: '📝', color: '#0891b2', monsterPrefix: 'Chair' },
  { name: 'Plenary Hall', description: 'The plenary is in session.', theme: 'congress', emoji: '🎤', color: '#0e7490', monsterPrefix: 'Speaker' },
  { name: 'Pork Barrel Vault', description: 'Where the pork is stored.', theme: 'congress', emoji: '🥩', color: '#155e75', monsterPrefix: 'Pork' },
  { name: 'Lobbyist Lair', description: 'The lobbyists are everywhere.', theme: 'congress', emoji: '💼', color: '#164e63', monsterPrefix: 'Lobbyist' },
  { name: 'Media Room', description: 'Press conferences and spin.', theme: 'congress', emoji: '📺', color: '#083344', monsterPrefix: 'Spinner' },
  { name: 'Opposition Office', description: 'The minority bloc fights back.', theme: 'congress', emoji: '⚡', color: '#0284c7', monsterPrefix: 'Minority' },
  { name: 'Majority Mansion', description: 'The supermajority superpower.', theme: 'congress', emoji: '🏰', color: '#0369a1', monsterPrefix: 'Majority' },
  { name: 'Impeachment Court', description: 'Articles of impeachment on the table.', theme: 'congress', emoji: '⚖️', color: '#075985', monsterPrefix: 'Prosecutor' },
  { name: 'Speaker\'s Throne', description: 'The Speaker of the House.', theme: 'congress', emoji: '👑', color: '#ef4444', monsterPrefix: 'BOSS' },

  // Region 5: Senate Citadel (maps 41-50)
  { name: 'Senate Entrance', description: 'The upper house awaits.', theme: 'senate', emoji: '🏯', color: '#ec4899', monsterPrefix: 'Guard' },
  { name: 'Blue Ribbon Hall', description: 'Investigations in aid of legislation.', theme: 'senate', emoji: '🔵', color: '#db2777', monsterPrefix: 'Investigator' },
  { name: 'Senate Inquiry', description: 'Another hearing, another headline.', theme: 'senate', emoji: '🔍', color: '#be185d', monsterPrefix: 'Senator' },
  { name: 'Executive Session', description: 'Behind closed doors.', theme: 'senate', emoji: '🚪', color: '#9d174d', monsterPrefix: 'Exec' },
  { name: 'Privilege Speech', description: 'A senator has the floor.', theme: 'senate', emoji: '🎙️', color: '#831843', monsterPrefix: 'Orator' },
  { name: 'Caucus Chamber', description: 'Party-line politics at play.', theme: 'senate', emoji: '🤝', color: '#701a75', monsterPrefix: 'Caucus' },
  { name: 'Amendments Arena', description: 'Every bill has a thousand amendments.', theme: 'senate', emoji: '📜', color: '#86198f', monsterPrefix: 'Amender' },
  { name: 'Bicameral Battle', description: 'Senate vs House — who blinks first?', theme: 'senate', emoji: '⚔️', color: '#a21caf', monsterPrefix: 'Bicam' },
  { name: 'Senate Election', description: '12 seats up for grabs.', theme: 'senate', emoji: '🗳️', color: '#c026d3', monsterPrefix: 'Kandidato' },
  { name: 'Senate President', description: 'The Senate President stands before you.', theme: 'senate', emoji: '👑', color: '#dc2626', monsterPrefix: 'BOSS' },

  // Region 6: Malacañang Mayhem (maps 51-60)
  { name: 'Palace Gates', description: 'Malacañang — the seat of power.', theme: 'palace', emoji: '🏰', color: '#fbbf24', monsterPrefix: 'PSG' },
  { name: 'Press Briefing Room', description: 'Facing the Malacañang press corps.', theme: 'palace', emoji: '📰', color: '#f59e0b', monsterPrefix: 'Reporter' },
  { name: 'Cabinet Meeting', description: 'The cabinet is in session.', theme: 'palace', emoji: '👥', color: '#d97706', monsterPrefix: 'Secretary' },
  { name: 'Executive Order Desk', description: 'Signing orders with a stroke of the pen.', theme: 'palace', emoji: '🖊️', color: '#b45309', monsterPrefix: 'EO' },
  { name: 'Veto Chamber', description: 'Veto or be vetoed.', theme: 'palace', emoji: '✖️', color: '#92400e', monsterPrefix: 'Veto' },
  { name: 'Diplomatic Reception', description: 'Foreign dignitaries and protocol.', theme: 'palace', emoji: '🌏', color: '#78350f', monsterPrefix: 'Envoy' },
  { name: 'Crisis Room', description: 'National emergency — real or manufactured.', theme: 'palace', emoji: '🚨', color: '#dc2626', monsterPrefix: 'Crisis' },
  { name: 'Appointments Office', description: 'Who you know, not what you know.', theme: 'palace', emoji: '🤝', color: '#b91c1c', monsterPrefix: 'Appointee' },
  { name: 'Presidential Debate', description: 'The final debate before the election.', theme: 'palace', emoji: '🎤', color: '#991b1b', monsterPrefix: 'Rival' },
  { name: 'Presidential Throne', description: 'The President of the Philippines.', theme: 'palace', emoji: '👑', color: '#ef4444', monsterPrefix: 'BOSS' },

  // Region 7: Supreme Court Sanctum (maps 61-70)
  { name: 'SC Gates', description: 'The highest court of the land.', theme: 'sc', emoji: '⚖️', color: '#64748b', monsterPrefix: 'Guard' },
  { name: 'En Banc Session', description: 'All 15 justices are present.', theme: 'sc', emoji: '🏛️', color: '#475569', monsterPrefix: 'Justice' },
  { name: 'Oral Arguments', description: 'Defend your case before the court.', theme: 'sc', emoji: '🗣️', color: '#334155', monsterPrefix: 'Lawyer' },
  { name: 'Deliberation Room', description: 'The justices deliberate behind closed doors.', theme: 'sc', emoji: '🤔', color: '#1e293b', monsterPrefix: 'Ponente' },
  { name: 'Dissenting Opinion', description: 'A dissent that changes history.', theme: 'sc', emoji: '✍️', color: '#0f172a', monsterPrefix: 'Dissenter' },
  { name: 'TRO Chamber', description: 'Temporary restraining orders flying everywhere.', theme: 'sc', emoji: '⛔', color: '#64748b', monsterPrefix: 'TRO' },
  { name: 'Constitutional Challenge', description: 'Is this law constitutional?', theme: 'sc', emoji: '📕', color: '#475569', monsterPrefix: 'Petition' },
  { name: 'Judicial Review', description: 'The court reviews executive action.', theme: 'sc', emoji: '🔎', color: '#334155', monsterPrefix: 'Reviewer' },
  { name: 'Landmark Decision', description: 'A case that will be cited for decades.', theme: 'sc', emoji: '📜', color: '#1e293b', monsterPrefix: 'Landmark' },
  { name: 'Chief Justice', description: 'The Chief Justice of the Supreme Court.', theme: 'sc', emoji: '👑', color: '#dc2626', monsterPrefix: 'BOSS' },

  // Region 8: Comelec Colosseum (maps 71-80)
  { name: 'Voter Registration', description: 'Register or be disenfranchised.', theme: 'comelec', emoji: '📋', color: '#14b8a6', monsterPrefix: 'Registrar' },
  { name: 'Filing of COC', description: 'Certificate of Candidacy on the line.', theme: 'comelec', emoji: '📄', color: '#0d9488', monsterPrefix: 'Filer' },
  { name: 'Campaign Period', description: '90 days of nonstop campaigning.', theme: 'comelec', emoji: '🎪', color: '#0f766e', monsterPrefix: 'Campaigner' },
  { name: 'Miting de Avance', description: 'The grand rally before election day.', theme: 'comelec', emoji: '🎤', color: '#115e59', monsterPrefix: 'Rallyist' },
  { name: 'Election Day', description: 'The PCOS machines are... working?', theme: 'comelec', emoji: '🗳️', color: '#134e4a', monsterPrefix: 'BEI' },
  { name: 'Canvassing Center', description: 'The numbers are coming in.', theme: 'comelec', emoji: '📊', color: '#042f2e', monsterPrefix: 'Canvasser' },
  { name: 'Proclamation Hall', description: 'The winners are about to be proclaimed.', theme: 'comelec', emoji: '🏆', color: '#14b8a6', monsterPrefix: 'Proclaimer' },
  { name: 'Electoral Protest', description: 'I was cheated! — Every losing candidate ever.', theme: 'comelec', emoji: '⚡', color: '#0d9488', monsterPrefix: 'Protestor' },
  { name: 'Recount Battle', description: 'Count every ballot. Again. And again.', theme: 'comelec', emoji: '🔢', color: '#0f766e', monsterPrefix: 'Counter' },
  { name: 'Comelec Chair', description: 'The COMELEC Chairperson.', theme: 'comelec', emoji: '👑', color: '#dc2626', monsterPrefix: 'BOSS' },

  // Region 9: Ombudsman Office (maps 81-90)
  { name: 'Ombudsman Gates', description: 'The graft busters await.', theme: 'ombudsman', emoji: '🔍', color: '#ef4444', monsterPrefix: 'Agent' },
  { name: 'Complaint Desk', description: 'File your complaint here.', theme: 'ombudsman', emoji: '📝', color: '#dc2626', monsterPrefix: 'Clerk' },
  { name: 'Preliminary Investigation', description: 'Is there probable cause?', theme: 'ombudsman', emoji: '🔎', color: '#b91c1c', monsterPrefix: 'Investigator' },
  { name: 'Graft Charges', description: 'Section 3(e) of RA 3019.', theme: 'ombudsman', emoji: '⚖️', color: '#991b1b', monsterPrefix: 'Prosecutor' },
  { name: 'Plunder Case', description: 'At least P50 million in ill-gotten wealth.', theme: 'ombudsman', emoji: '💰', color: '#7f1d1d', monsterPrefix: 'Plunderer' },
  { name: 'Sandiganbayan', description: 'The anti-graft court.', theme: 'ombudsman', emoji: '🏛️', color: '#450a0a', monsterPrefix: 'Justice' },
  { name: 'Suspension Order', description: '90-day preventive suspension.', theme: 'ombudsman', emoji: '⛔', color: '#ef4444', monsterPrefix: 'Suspended' },
  { name: 'Dismissal Decree', description: 'Dismissed from service with prejudice.', theme: 'ombudsman', emoji: '❌', color: '#dc2626', monsterPrefix: 'Dismissed' },
  { name: 'Lifestyle Check', description: 'Your assets do not match your SALN.', theme: 'ombudsman', emoji: '🏠', color: '#b91c1c', monsterPrefix: 'Checker' },
  { name: 'Ombudsman Boss', description: 'The Ombudsman herself.', theme: 'ombudsman', emoji: '👑', color: '#dc2626', monsterPrefix: 'BOSS' },

  // Region 10: Impeachment Island (maps 91-100) — final region
  { name: 'Impeachment Filing', description: 'The complaint has been filed.', theme: 'impeachment', emoji: '📋', color: '#dc2626', monsterPrefix: 'Filer' },
  { name: 'Committee Hearing', description: 'Is the complaint sufficient in form?', theme: 'impeachment', emoji: '🔍', color: '#b91c1c', monsterPrefix: 'Chair' },
  { name: 'Articles of Impeachment', description: 'The articles have been drafted.', theme: 'impeachment', emoji: '📜', color: '#991b1b', monsterPrefix: 'Drafter' },
  { name: 'House Vote', description: 'One-third of the House must agree.', theme: 'impeachment', emoji: '🗳️', color: '#7f1d1d', monsterPrefix: 'Congressman' },
  { name: 'Senate Trial', description: 'The Senate sits as an impeachment court.', theme: 'impeachment', emoji: '⚖️', color: '#450a0a', monsterPrefix: 'Judge' },
  { name: 'Prosecution Panel', description: 'The House prosecution team.', theme: 'impeachment', emoji: '⚔️', color: '#dc2626', monsterPrefix: 'Prosecutor' },
  { name: 'Defense Panel', description: 'The best lawyers money can buy.', theme: 'impeachment', emoji: '🛡️', color: '#b91c1c', monsterPrefix: 'Defender' },
  { name: 'Witness Testimony', description: 'The star witness takes the stand.', theme: 'impeachment', emoji: '🎤', color: '#991b1b', monsterPrefix: 'Witness' },
  { name: 'Closing Arguments', description: 'The final words before the verdict.', theme: 'impeachment', emoji: '🎙️', color: '#7f1d1d', monsterPrefix: 'Closer' },
  { name: 'The Verdict', description: 'Guilty or not guilty — the nation watches.', theme: 'impeachment', emoji: '👑', color: '#ef4444', monsterPrefix: 'BOSS' },
]

// ---- Build the full map list (1-100) ----
export const CAMPAIGN_MAPS: CampaignMap[] = MAP_THEMES.map((t, i) => ({
  ...t,
  id: i + 1,
  stages: 10,
}))

// ---- Get a specific map ----
export function getCampaignMap(mapId: number): CampaignMap | undefined {
  return CAMPAIGN_MAPS.find((m) => m.id === mapId)
}

// ---- Monster name generator ----
const MONSTER_ADJECTIVES = [
  'Corrupt', 'Greedy', 'Ruthless', 'Cunning', 'Vicious', 'Menacing',
  'Devious', 'Savage', 'Brutal', 'Shadowy', 'Merciless', 'Twisted',
  'Venomous', 'Fierce', 'Wicked', 'Sinister', 'Dreadful', 'Fearsome',
]

const MONSTER_SUFFIXES = [
  'Trapo', 'Mandaramay', 'Epal', 'Buwaya', 'Kurakot',
  'Sindikato', 'Mafia', 'Kartel', 'Dynasty', 'Warlord',
]

function getMonsterName(mapId: number, stageId: number, prefix: string): string {
  const isBoss = stageId === 10
  if (isBoss) {
    const suffix = MONSTER_SUFFIXES[(mapId - 1) % MONSTER_SUFFIXES.length]
    return `${prefix} ${suffix}`
  }
  const adj = MONSTER_ADJECTIVES[(mapId + stageId) % MONSTER_ADJECTIVES.length]
  return `${adj} ${prefix}`
}

// ---- Monster special abilities (bosses only) ----
const BOSS_SPECIALS = [
  { name: 'Red Tape Wrap', description: 'Stuns your card for 1 turn.', cooldown: 3 },
  { name: 'Pork Barrel', description: 'Heals 30% of max HP.', cooldown: 4 },
  { name: 'Smear Campaign', description: 'Reduces your card\'s attack by 30% for 2 turns.', cooldown: 3 },
  { name: 'Vote Buying', description: 'Deals double damage this turn.', cooldown: 3 },
  { name: 'Executive Order', description: 'Clears all debuffs and gains +2 ATK.', cooldown: 4 },
]

// ---- Generate a monster for a specific stage ----
export function generateMonster(mapId: number, stageId: number): CampaignMonster {
  const map = getCampaignMap(mapId)
  const prefix = map?.monsterPrefix || 'Unknown'
  const difficulty = (mapId - 1) * 10 + stageId // 1 to 1000
  const level = Math.ceil(difficulty / 10) // 1 to 100
  const isBoss = stageId === 10

  // Scaled difficulty — harder curve to encourage pack buying
  // HP scales ~linearly but with acceleration at higher levels
  const baseHp = 25 + Math.floor(Math.pow(difficulty, 1.15) * 3)
  const baseAtk = 4 + Math.floor(Math.pow(difficulty, 1.1) * 0.35)
  const baseDef = 1 + Math.floor(Math.pow(difficulty, 1.05) * 0.12)

  // Bosses are 3x stronger (was 2.5x)
  const hpMult = isBoss ? 3 : 1
  const atkMult = isBoss ? 2 : 1
  const defMult = isBoss ? 2.5 : 1

  const hp = Math.floor(baseHp * hpMult)
  const attack = Math.floor(baseAtk * atkMult)
  const defense = Math.floor(baseDef * defMult)

  const name = getMonsterName(mapId, stageId, prefix)
  const title = `Stage ${stageId} • Level ${level}${isBoss ? ' • BOSS' : ''}`

  // Bosses get a special ability
  const special = isBoss
    ? BOSS_SPECIALS[(mapId + stageId) % BOSS_SPECIALS.length]
    : undefined

  return {
    id: `m${mapId}-${stageId}`,
    name,
    title,
    hp,
    maxHp: hp,
    attack,
    defense,
    level,
    faction: map?.theme || 'trapo',
    emoji: isBoss ? '👑' : '👹',
    flavor: map?.description || '',
    special,
  }
}

// ---- Get all stages for a map ----
export function getCampaignStages(mapId: number): CampaignStage[] {
  return Array.from({ length: 10 }, (_, i) => {
    const stageId = i + 1
    return {
      mapId,
      stageId,
      monster: generateMonster(mapId, stageId),
      rewardCoins: 10 + mapId * 5 + stageId * 2,
      unlocked: false, // determined by progress
    }
  })
}

// ---- Get player coin reward per map ----
export function getMapCompletionReward(mapId: number): number {
  return mapId * 100
}
