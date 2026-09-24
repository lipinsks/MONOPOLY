import type { GameState, PlayerState, TileState } from '../api/types'

export function makePlayer(overrides: Partial<PlayerState> & Pick<PlayerState, 'id'>): PlayerState {
  return {
    name: `Gracz ${overrides.id + 1}`,
    color: '#e5484d',
    money: 1500,
    position: 0,
    in_jail: false,
    jail_turns: 0,
    is_bankrupt: false,
    properties: 0,
    get_out_of_jail_cards: 0,
    is_human: true,
    ...overrides,
  }
}

export function makeTile(overrides: Partial<TileState> & Pick<TileState, 'id'>): TileState {
  return {
    name: `Pole ${overrides.id}`,
    type: 'property',
    group: null,
    price: null,
    house_cost: null,
    rents: null,
    mortgage: null,
    amount: null,
    owner: null,
    owner_id: null,
    houses: 0,
    is_mortgaged: false,
    ...overrides,
  }
}

export function makeBrownStreet(id: number, overrides: Partial<TileState> = {}): TileState {
  return makeTile({
    id,
    type: 'property',
    group: 'saddlebrown',
    price: 60,
    house_cost: 50,
    rents: [2, 10, 30, 90, 160, 250],
    mortgage: 30,
    ...overrides,
  })
}

export function makeRailroad(id: number, overrides: Partial<TileState> = {}): TileState {
  return makeTile({
    id,
    type: 'railroad',
    group: 'railroad',
    price: 200,
    rents: [25, 50, 100, 200],
    mortgage: 100,
    ...overrides,
  })
}

export function makeState(overrides: Partial<GameState> = {}): GameState {
  const players = overrides.players ?? [makePlayer({ id: 0 }), makePlayer({ id: 1 })]
  return {
    game_started: true,
    room_name: 'Pokój testowy',
    enforce_permissions: false,
    ai_delay: 1.5,
    turns: 0,
    max_turns: 150,
    latest_log: '',
    history_logs: [],
    winner: null,
    game_over_reason: null,
    waiting_for_human: true,
    human_action: 'ROLL',
    current_player: players[0].name,
    current_player_id: 0,
    current_player_in_jail: false,
    turn_dice: null,
    turn_message: '',
    turn_card: '',
    turn_card_type: null,
    roll_count: 0,
    extra_turn: false,
    buy_tile_id: null,
    active_trade: null,
    board: [],
    ...overrides,
    players,
  }
}
