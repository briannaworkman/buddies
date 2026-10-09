// Draws the README images in docs/ from the real sprites, so they match the plugin.
// Run after changing the art: npx tsx scripts/readme-art.ts

import { mkdirSync, writeFileSync } from 'node:fs'

import type { Face, ItemId, Rarity, SpeciesName, Stage } from '../types'

import { buddySvg, isLegendarySpecies, SPECIES_NAMES } from '../hooks/art'
import { ITEMS } from '../hooks/data'

type Cell = { species: SpeciesName; mood?: Face; stage?: Stage; rarity?: Rarity; wearing?: ItemId | null; label: string; sub?: string }

const LABELS: Partial<Record<SpeciesName, string>> = { redpanda: 'red panda', duck: 'rubber duck' }
const SPRITE_W = 110
const SPRITE_H = (SPRITE_W * 19) / 22
const CARD_W = 128
const GAP = 10
const FONT = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'

const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')

// One light card per sprite, so dark sprites stay visible on GitHub's dark theme.
function sheet(cells: Cell[], columns: number): string {
  const cardH = SPRITE_H + (cells.some(c => c.sub) ? 46 : 32)
  const rows = Math.ceil(cells.length / columns)
  const width = columns * CARD_W + (columns - 1) * GAP
  const height = rows * cardH + (rows - 1) * GAP
  const cards = cells.map((c, i) => {
    const x = (i % columns) * (CARD_W + GAP)
    const y = Math.floor(i / columns) * (cardH + GAP)
    const sprite = buddySvg({ species: c.species, mood: c.mood ?? 'idle', stage: c.stage ?? 'grown', rarity: c.rarity ?? 'common', wearing: c.wearing ?? null })
      .replace('<svg ', `<svg x="${x + (CARD_W - SPRITE_W) / 2}" y="${y + 6}" width="${SPRITE_W}" height="${SPRITE_H}" `)
    const label = `<text x="${x + CARD_W / 2}" y="${y + SPRITE_H + 22}" text-anchor="middle" font-family="${FONT}" font-size="13" font-weight="600" fill="#24292f">${escape(c.label)}</text>`
    const sub = c.sub
      ? `<text x="${x + CARD_W / 2}" y="${y + SPRITE_H + 38}" text-anchor="middle" font-family="${FONT}" font-size="11" fill="#57606a">${escape(c.sub)}</text>`
      : ''
    return `<rect x="${x}" y="${y}" width="${CARD_W}" height="${cardH}" rx="10" fill="#f6f8fa" stroke="#d0d7de"/>${sprite}${label}${sub}`
  })
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-1 -1 ${width + 2} ${height + 2}" width="${width + 2}" height="${height + 2}">${cards.join('')}</svg>\n`
}

const cast: Cell[] = SPECIES_NAMES.map(species =>
  isLegendarySpecies(species)
    ? { species, rarity: 'legendary', label: species, sub: '✦ legendary' }
    : { species, label: LABELS[species] ?? species },
)

const MOODS: [Face, string, string][] = [
  ['idle', 'idle', 'just blinking'],
  ['happy', 'happy', 'tests passed'],
  ['love', 'love', 'just got petted'],
  ['sad', 'sad', 'a tool failed'],
  ['busy', 'busy', 'Claude is editing'],
  ['sleepy', 'sleepy', 'after 10pm'],
  ['grumpy', 'grumpy', 'no pets in a day'],
]
const moods: Cell[] = MOODS.map(([mood, label, sub]) => ({ species: 'dog', mood, label, sub }))

const growth: Cell[] = [
  { species: 'fox', stage: 'baby', label: 'baby', sub: 'levels 1–4' },
  { species: 'fox', stage: 'grown', label: 'grown-up', sub: 'levels 5–9' },
  { species: 'fox', stage: 'grown', rarity: 'rare', mood: 'happy', label: 'rare', sub: '1 in 10 hatches' },
  { species: 'fox', stage: 'radiant', rarity: 'rare', mood: 'love', wearing: 'crown', label: 'radiant', sub: 'level 10+' },
  { species: 'dragon', stage: 'radiant', rarity: 'legendary', mood: 'happy', label: 'legendary', sub: '1 in 20 hatches' },
]

const wardrobe: Cell[] = ITEMS.map(item => ({ species: 'cat', mood: 'happy', wearing: item.id, label: item.name }))

mkdirSync(new URL('../docs/', import.meta.url), { recursive: true })
const write = (name: string, svg: string) => writeFileSync(new URL(`../docs/${name}`, import.meta.url), svg)
write('cast.svg', sheet(cast, 6))
write('moods.svg', sheet(moods, 7))
write('growth.svg', sheet(growth, 5))
write('wardrobe.svg', sheet(wardrobe, 9))
console.log('Wrote docs/cast.svg, docs/moods.svg, docs/growth.svg, docs/wardrobe.svg')
