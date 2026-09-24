const integerFormat = new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 0 })
const decimalFormat = new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 1 })
const pluralRules = new Intl.PluralRules('pl-PL')

export function formatMoney(value: number): string {
  return `${value < 0 ? '-' : ''}$${integerFormat.format(Math.abs(value))}`
}

export function formatDelta(value: number): string {
  const sign = value > 0 ? '+' : value < 0 ? '-' : ''
  return `${sign}$${integerFormat.format(Math.abs(value))}`
}

export function formatSeconds(value: number): string {
  return `${decimalFormat.format(value)} s`
}

export interface PluralForms {
  one: string
  few: string
  many: string
}

function plural(count: number, forms: PluralForms): string {
  const category = pluralRules.select(count)
  if (category === 'one') return forms.one
  if (category === 'few') return forms.few
  return forms.many
}

export function countOf(count: number, forms: PluralForms): string {
  return `${count} ${plural(count, forms)}`
}

export const WORDS = {
  player: { one: 'gracz', few: 'graczy', many: 'graczy' },
  person: { one: 'osoba', few: 'osoby', many: 'osób' },
  bot: { one: 'bot', few: 'boty', many: 'botów' },
  house: { one: 'dom', few: 'domy', many: 'domów' },
  card: { one: 'karta', few: 'karty', many: 'kart' },
  pip: { one: 'oczko', few: 'oczka', many: 'oczek' },
  turn: { one: 'tura', few: 'tury', many: 'tur' },
} satisfies Record<string, PluralForms>
