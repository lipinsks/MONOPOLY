export type HumanAction = 'ROLL' | 'BUY' | 'ACKNOWLEDGE'

export type TileType =
  'start' | 'property' | 'chest' | 'tax' | 'railroad' | 'chance' | 'jail' | 'utility' | 'free_parking' | 'go_to_jail'

export type ColorGroup =
  'saddlebrown' | 'lightblue' | 'mediumvioletred' | 'darkorange' | 'red' | 'gold' | 'green' | 'blue'

export type TileGroup = ColorGroup | 'railroad' | 'utility'

export type CardDeck = 'chance' | 'chest'

export type GameOverReason = 'winner' | 'turn_limit'

export interface PlayerState {
  id: number
  name: string
  color: string
  money: number
  position: number
  in_jail: boolean
  jail_turns: number
  is_bankrupt: boolean
  properties: number
  get_out_of_jail_cards: number
  is_human: boolean
}

export interface TileState {
  id: number
  name: string
  type: TileType
  group: TileGroup | null
  price: number | null
  house_cost: number | null
  rents: number[] | null
  mortgage: number | null
  amount: number | null
  owner: string | null
  owner_id: number | null
  houses: number
  is_mortgaged: boolean
}

export interface TradeOffer {
  from: string
  to: string
  from_id: number | null
  to_id: number | null
  offer_tile_ids: number[]
  request_tile_ids: number[]
  offer_money: number
  request_money: number
  offer_cards: number
  request_cards: number
}

export interface GameState {
  game_started: boolean
  room_name: string
  enforce_permissions: boolean
  ai_delay: number
  turns: number
  max_turns: number
  latest_log: string
  history_logs: string[]
  winner: string | null
  game_over_reason: GameOverReason | null
  waiting_for_human: boolean
  human_action: HumanAction
  current_player: string
  current_player_id: number
  current_player_in_jail: boolean
  turn_dice: [number, number] | null
  turn_message: string
  turn_card: string
  turn_card_type: CardDeck | null
  roll_count: number
  extra_turn: boolean
  buy_tile_id: number | null
  active_trade: TradeOffer | null
  players: PlayerState[]
  board: TileState[]
}

export interface RoomSummary {
  id: string
  name: string
  started: boolean
  players_count: number
}

export interface PlayerSetup {
  name: string
  color: string
  is_ai: boolean
}

export interface RoomSettings {
  ai_delay?: number
  max_turns?: number
}

export type TurnActionType = 'ROLL' | 'BUY' | 'PASS' | 'ACKNOWLEDGE' | 'JAIL_PAY' | 'JAIL_ROLL' | 'JAIL_CARD'

export type PropertyActionType = 'BUILD' | 'SELL_HOUSE' | 'MORTGAGE' | 'UNMORTGAGE'

export interface TradeProposal {
  action: 'PROPOSE_TRADE'
  from_player: string
  target_player: string
  offer_tile_ids: number[]
  request_tile_ids: number[]
  offer_money: number
  request_money: number
  offer_cards: number
  request_cards: number
}

export type GameAction =
  | { action: TurnActionType }
  | { action: PropertyActionType; tile_id: number }
  | { action: 'RENAME_PLAYER'; player_index: number; new_name: string }
  | { action: 'RESPOND_TRADE'; accept: boolean }
  | TradeProposal
