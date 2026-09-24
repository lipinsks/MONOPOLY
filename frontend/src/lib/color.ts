const HEX_COLOR = /^#[0-9a-f]{6}$/i

const FALLBACK_COLOR = '#8a948f'

export function safeColor(color: string | null | undefined): string {
  return color && HEX_COLOR.test(color) ? color : FALLBACK_COLOR
}

function linearChannel(hexPair: string): number {
  const value = parseInt(hexPair, 16) / 255
  return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
}

function relativeLuminance(color: string): number {
  const hex = safeColor(color)
  const red = linearChannel(hex.slice(1, 3))
  const green = linearChannel(hex.slice(3, 5))
  const blue = linearChannel(hex.slice(5, 7))
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue
}

export function readableOn(color: string, threshold = 0.4): string {
  return relativeLuminance(color) > threshold ? '#16211b' : '#ffffff'
}

function toChannels(color: string): number[] {
  const hex = safeColor(color)
  return [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16))
}

function mixColors(color: string, target: string, amount: number): string {
  const from = toChannels(color)
  const to = toChannels(target)
  const mixed = from.map((channel, index) => Math.round(channel + (to[index] - channel) * amount))
  return `#${mixed.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`
}

export function lighten(color: string, amount: number): string {
  return mixColors(color, '#ffffff', amount)
}

export function darken(color: string, amount: number): string {
  return mixColors(color, '#000000', amount)
}
