// ============================================================
// PoliClash PH — Core Type Definitions
// ============================================================

// ---- Card Rarity ----
export type CardRarity = 'common' | 'rare' | 'epic' | 'mythic' | 'legendary';

// ---- Card Faction (political parody tropes) ----
export type CardFaction =
  | 'trapo'       // Traditional politician
  | 'reformer'    // Idealistic reformer
  | 'showbiz'     // Celebrity politician
  | 'dynasty'     // Political dynasty family
  | 'activist'    // People's advocate
  | 'warlord';    // Local strongman

// ---- Ability Type ----
export type AbilityType =
  | 'buff_adjacent'    // Buff cards next to this one
  | 'break_defense'    // Privilege speech — ignore enemy defense
  | 'steal_budget'     // Pork barrel — steal enemy budget
  | 'rally_support'    // Campaign rally — +Charisma to all allies
  | 'blackmail'        // Destroy enemy card with lowest Influence
  | 'vote_buy'         // Add +1 to all stats temporarily
  | 'immunity'         // Cannot be targeted for 1 turn
  | 'legacy'           // When destroyed, buff adjacent allies
  | 'pardon'           // Revive a destroyed ally
  | 'investigate'      // Reveal enemy card stats
  | 'pork_barrel';     // Generate extra budget

// ---- Ability Definition ----
export interface CardAbility {
  id: string;
  name: string;        // e.g., "Privilege Speech"
  type: AbilityType;
  description: string;
  power: number;       // numeric potency of the effect
  cooldown: number;    // turns to wait before reusing
  trigger: 'on_play' | 'on_attack' | 'on_destroy' | 'on_turn_start' | 'active';
}

// ---- Card Stats ----
export interface CardStats {
  charisma: number;    // 0-10
  machinery: number;   // 0-10
  budget: number;      // 0-10
  influence: number;   // 0-10
}

// ---- Full Card Definition (data model) ----
export interface GameCard {
  id: string;
  name: string;               // Parody name, e.g., "Mayor Budots"
  title: string;              // Political title, e.g., "Mayor of Talisay"
  faction: CardFaction;
  rarity: CardRarity;
  stats: CardStats;
  ability: CardAbility | null;
  art_url: string;            // Supabase Storage URL for card art
  flavor_text: string;        // Satirical tagline
  cost: number;               // Budget cost to play the card (1-10)
  pack_source: string;        // Which pack this card belongs to
  created_at?: string;
}

// ---- Board Position ----
export interface BoardPosition {
  card: GameCard | null;
  is_face_down: boolean;      // hidden from opponent
  ability_used_this_turn: boolean;
  immunity_active: boolean;
  temporary_buffs: Partial<CardStats>;
}

// ---- Player State ----
export interface PlayerState {
  id: string;
  name: string;
  health: number;             // 0-30
  budget_pool: number;        // available budget to play cards
  hand: GameCard[];
  board: BoardPosition[];     // positions for played cards
  deck: GameCard[];
  graveyard: GameCard[];
}

// ---- Game State ----
export interface GameState {
  id: string;
  current_turn: 'player' | 'opponent';
  turn_number: number;
  player: PlayerState;
  opponent: PlayerState;
  log: string[];
  status: 'ongoing' | 'player_win' | 'opponent_win' | 'draw';
}

// ---- Shop Pack Definition ----
export interface ShopPack {
  id: string;
  name: string;               // e.g., "Mythic Trapo Pack"
  description: string;
  price: number;              // in PHP (e.g., 50)
  card_count: number;         // how many cards in the pack
  guaranteed_rarity: CardRarity;
  rarity_weights: Record<CardRarity, number>;
  art_url: string;
  featured_cards: string[];  // card names included
}

// ---- Transaction (GCash Receipt Queue) ----
export interface Transaction {
  reference_number: string;
  user_id: string;
  amount: number;
  pack_id: string;
  receipt_url: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  user_email?: string;        // joined for admin view
}

// ---- User Pack Inventory ----
export interface UserPack {
  id: string;
  user_id: string;
  pack_id: string;
  pack_name: string;
  status: 'unopened' | 'opened';
  obtained_at: string;
  transaction_ref: string | null;
}

// ---- User Card Inventory ----
export interface UserCard {
  id: string;
  user_id: string;
  card_id: string;
  card_name: string;
  obtained_at: string;
  pack_id: string | null;
}

// ---- API Response ----
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}