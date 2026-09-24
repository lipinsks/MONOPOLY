import { describe, expect, it } from 'vitest'
import { makeBrownStreet, makePlayer, makeRailroad } from '../test/fixtures'
import { currentRent, netWorth, propertyActions, rankPlayers, tradableTiles } from './rules'

const owner = makePlayer({ id: 0 })
const actionTypes = (actions: ReturnType<typeof propertyActions>) => actions.map((action) => action.type)

describe('propertyActions', () => {
  it('offers building only with the full colour set', () => {
    const board = [makeBrownStreet(1, { owner_id: 0 }), makeBrownStreet(3, { owner_id: 1 })]
    expect(actionTypes(propertyActions(board, board[0], owner))).toEqual(['MORTGAGE'])
  })

  it('enforces even building and selling across the set', () => {
    const board = [makeBrownStreet(1, { owner_id: 0, houses: 1 }), makeBrownStreet(3, { owner_id: 0 })]
    expect(actionTypes(propertyActions(board, board[0], owner))).toEqual(['SELL_HOUSE'])
    expect(actionTypes(propertyActions(board, board[1], owner))).toEqual(['BUILD'])
  })

  it('blocks building while any street in the set is mortgaged', () => {
    const board = [makeBrownStreet(1, { owner_id: 0 }), makeBrownStreet(3, { owner_id: 0, is_mortgaged: true })]
    expect(actionTypes(propertyActions(board, board[0], owner))).toEqual(['MORTGAGE'])
  })

  it('marks building as unaffordable when cash is short', () => {
    const board = [makeBrownStreet(1, { owner_id: 0 }), makeBrownStreet(3, { owner_id: 0 })]
    const [build] = propertyActions(board, board[0], makePlayer({ id: 0, money: 20 }))
    expect(build).toEqual({ type: 'BUILD', amount: 50, affordable: false })
  })

  it('charges ten percent interest to lift a mortgage', () => {
    const board = [makeBrownStreet(1, { owner_id: 0, is_mortgaged: true })]
    expect(propertyActions(board, board[0], owner)).toEqual([{ type: 'UNMORTGAGE', amount: 33, affordable: true }])
  })
})

describe('currentRent', () => {
  it('doubles the base rent of an undeveloped full set', () => {
    const board = [makeBrownStreet(1, { owner_id: 0 }), makeBrownStreet(3, { owner_id: 0 })]
    expect(currentRent(board, board[0])).toEqual({ kind: 'fixed', amount: 4, doubled: true })
  })

  it('scales railroad rent with the number of railroads owned', () => {
    const board = [makeRailroad(5, { owner_id: 0 }), makeRailroad(15, { owner_id: 0 }), makeRailroad(25)]
    expect(currentRent(board, board[0])).toEqual({ kind: 'fixed', amount: 50, doubled: false })
  })

  it('returns nothing for mortgaged or unowned tiles', () => {
    expect(currentRent([], makeBrownStreet(1))).toBeNull()
    expect(currentRent([], makeBrownStreet(1, { owner_id: 0, is_mortgaged: true }))).toBeNull()
  })
})

describe('netWorth and ranking', () => {
  it('adds property and building value to cash', () => {
    const board = [
      makeBrownStreet(1, { owner_id: 0, houses: 2 }),
      makeBrownStreet(3, { owner_id: 0, is_mortgaged: true }),
    ]
    expect(netWorth(board, makePlayer({ id: 0, money: 100 }))).toBe(100 + 60 + 100 + (60 - 33))
  })

  it('ranks bankrupt players last', () => {
    const rich = makePlayer({ id: 0, money: 5000, is_bankrupt: true })
    const poor = makePlayer({ id: 1, money: 10 })
    expect(rankPlayers([], [rich, poor]).map((player) => player.id)).toEqual([1, 0])
  })
})

describe('tradableTiles', () => {
  it('skips tiles with buildings', () => {
    const board = [makeBrownStreet(1, { owner_id: 0, houses: 1 }), makeBrownStreet(3, { owner_id: 0 })]
    expect(tradableTiles(board, 0).map((tile) => tile.id)).toEqual([3])
  })
})
