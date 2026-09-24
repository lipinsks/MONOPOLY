import { describe, expect, it } from 'vitest'
import { countOf, formatDelta, formatMoney, WORDS } from './format'

const normalizeSpaces = (text: string) => text.replace(/\s/g, ' ')

describe('formatMoney', () => {
  it('formats amounts with the dollar sign used by the game', () => {
    expect(formatMoney(1380)).toBe('$1380')
    expect(normalizeSpaces(formatMoney(15000))).toBe('$15 000')
    expect(formatMoney(-50)).toBe('-$50')
  })

  it('signs deltas', () => {
    expect(formatDelta(200)).toBe('+$200')
    expect(formatDelta(-6)).toBe('-$6')
  })
})

describe('countOf', () => {
  it('follows Polish plural rules', () => {
    expect(countOf(1, WORDS.house)).toBe('1 dom')
    expect(countOf(3, WORDS.house)).toBe('3 domy')
    expect(countOf(5, WORDS.house)).toBe('5 domów')
    expect(countOf(12, WORDS.house)).toBe('12 domów')
    expect(countOf(22, WORDS.house)).toBe('22 domy')
  })
})
