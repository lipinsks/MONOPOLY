import { describe, expect, it } from 'vitest'
import { makePlayer, makeState } from '../test/fixtures'
import { canControlTurn, canManageProperties, canProposeTrade, canRespondToTrade } from './permissions'

const seated = (role: number | null) => ({ role, isHost: false })

describe('canControlTurn', () => {
  it('lets any seated player act for a human in an open room', () => {
    expect(canControlTurn(makeState(), seated(1))).toBe(true)
  })

  it('limits control to the current player when permissions are enforced', () => {
    const state = makeState({ enforce_permissions: true })
    expect(canControlTurn(state, seated(1))).toBe(false)
    expect(canControlTurn(state, seated(0))).toBe(true)
  })

  it('never lets spectators act', () => {
    expect(canControlTurn(makeState(), seated(null))).toBe(false)
  })

  it('never takes over a bot turn or a finished game', () => {
    const botTurn = makeState({ players: [makePlayer({ id: 0, is_human: false }), makePlayer({ id: 1 })] })
    expect(canControlTurn(botTurn, seated(1))).toBe(false)
    expect(canControlTurn(makeState({ game_over_reason: 'turn_limit' }), seated(0))).toBe(false)
  })
})

describe('canManageProperties', () => {
  it('allows managing only the properties of the player on turn', () => {
    const state = makeState()
    expect(canManageProperties(state, seated(0), state.players[0])).toBe(true)
    expect(canManageProperties(state, seated(0), state.players[1])).toBe(false)
  })
})

describe('trades', () => {
  const trade = {
    from: 'Gracz 1',
    to: 'Gracz 2',
    from_id: 0,
    to_id: 1,
    offer_tile_ids: [],
    request_tile_ids: [],
    offer_money: 100,
    request_money: 0,
    offer_cards: 0,
    request_cards: 0,
  }

  it('lets only the addressee answer an offer', () => {
    const state = makeState({ active_trade: trade })
    expect(canRespondToTrade(state, seated(1))).toBe(true)
    expect(canRespondToTrade(state, seated(0))).toBe(false)
  })

  it('does not allow a second offer while one is pending', () => {
    expect(canProposeTrade(makeState(), seated(0))).toBe(true)
    expect(canProposeTrade(makeState({ active_trade: trade }), seated(0))).toBe(false)
  })
})
