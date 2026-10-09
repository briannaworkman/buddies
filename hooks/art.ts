import type { Face, ItemId, Rarity, SpeciesName, Stage } from '../types'

import { itemOf } from './data'
import { type Px, SPECIES, type Species } from './species'

export const SPECIES_NAMES = Object.keys(SPECIES) as SpeciesName[]
export const LEGENDARY_SPECIES = SPECIES_NAMES.filter(s => (SPECIES[s] as Species).isLegendary)
export const isSpecies = (name: string): name is SpeciesName => name in SPECIES
export const isLegendarySpecies = (name: SpeciesName) => LEGENDARY_SPECIES.includes(name)

const ASCII_FACES: Record<Face, string> = {
  idle: 'o.o',
  blink: '-.-',
  happy: '^.^',
  sad: ';.;',
  busy: 'o.O',
  love: '♥.♥',
  sleepy: 'u.u',
  grumpy: '-_-',
}

export const buddyAscii = (species: SpeciesName, mood: Face) => SPECIES[species].ascii.map(row => row.replace('{f}', ASCII_FACES[mood]))

// Sunglasses follow each species' own eyes rather than a fixed spot on the grid.
function sunglasses(sp: Species): string {
  const [[lx, ly], [rx, ry]] = sp.eyes
  // Dark lenses vanish on the robot's dark screen, so it gets a visor colour instead.
  const tint = sp.eyeColor ? '#ff4081' : '#212121'
  const lens = (x: number, y: number) => rect(x - 1, y - 1, tint, '', 3, 2) + rect(x - 1, y - 1, '#90caf9')
  return lens(lx, ly) + lens(rx, ry) + rect(lx + 2, ly - 1, tint, '', rx - lx - 3, 1)
}

const SHELL = ['', '', '', '', '', '', '', '', '', '', '', '', '..w.ww.ww.ww.w', '..wwwwwwwwwwww', '..wwwwwwwwwwww', '...dddddddddd']

const rect = (x: number, y: number, fill: string, extra = '', w = 1, h = 1) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"${extra ? ` ${extra}` : ''}/>`

function grid(rows: string[], colors: Record<string, string>): string {
  return rows
    .flatMap((row, y) => [...row].map((ch, x) => (colors[ch] ? rect(x, y, colors[ch]) : '')))
    .join('')
}

function face(sp: Species, mood: Face): string {
  const ink = sp.eyeColor ?? '#1a1a1a'
  const [mx, my] = sp.mouth
  const blink = `<animate attributeName="height" values="2;2;0.2;2" keyTimes="0;0.93;0.96;1" dur="4.5s" repeatCount="indefinite"/>`
  const eye = ([x, y]: Px, i: number): string => {
    switch (mood) {
      case 'happy':
        return rect(x - 1, y, ink) + rect(x, y - 1, ink) + rect(x + 1, y, ink)
      case 'love':
        return ([[x - 1, y - 1], [x + 1, y - 1], [x - 1, y], [x, y], [x + 1, y], [x, y + 1]] as Px[]).map(([a, b]) => rect(a, b, '#e53935')).join('')
      case 'sad':
        return rect(x, y, ink) + (i === 0 ? rect(x, y + 1, '#64b5f6') : '')
      case 'busy':
        return i === 0 ? rect(x, y, ink) : rect(x, y - 1, ink, '', 2, 2)
      case 'sleepy':
      case 'blink':
        return rect(x - 1, y, ink, '', 2, 1)
      case 'grumpy':
        return rect(x - 1, y, ink, '', 2, 1) + rect(i === 0 ? x - 1 : x, y - 2, ink) + rect(i === 0 ? x : x - 1, y - 1, ink)
      default:
        return `<rect x="${x}" y="${y - 1}" width="1" height="2" fill="${ink}">${blink}</rect>`
    }
  }
  const eyes = sp.eyes.map(eye).join('')
  const isGlad = mood === 'happy' || mood === 'love'
  const cheeks = isGlad ? rect(sp.eyes[0][0] - 1, sp.eyes[0][1] + 1, '#f48fb1', 'opacity="0.8"') + rect(sp.eyes[1][0] + 1, sp.eyes[1][1] + 1, '#f48fb1', 'opacity="0.8"') : ''
  let mouth: string
  // A beak is drawn in the species' accent colour.
  const beak = sp.palette.a ?? ink
  if (sp.isBeak) mouth = rect(mx, my, beak, '', 2, 1) + rect(mx, my + 1, beak, 'opacity="0.7"', 2, 1)
  else if (isGlad) mouth = rect(mx - 1, my, ink) + rect(mx + 2, my, ink) + rect(mx, my + 1, ink, '', 2, 1)
  else if (mood === 'sad') mouth = rect(mx, my, ink, '', 2, 1) + rect(mx - 1, my + 1, ink) + rect(mx + 2, my + 1, ink)
  else if (mood === 'busy' || mood === 'sleepy') mouth = rect(mx, my, ink)
  else if (mood === 'grumpy' || sp.isWideMouth) mouth = rect(mx - 1, my, ink, '', 4, 1)
  else mouth = rect(mx, my, ink, '', 2, 1)
  const zzz = mood === 'sleepy'
    ? `<text x="13" y="3" font-size="3.5" font-family="monospace" fill="#90a4ae">z<animate attributeName="y" values="4;0" dur="2.5s" repeatCount="indefinite"/><animate attributeName="opacity" values="1;0" dur="2.5s" repeatCount="indefinite"/></text>`
    : ''
  return eyes + cheeks + mouth + zzz
}

function sparkles(count: number, color: string): string {
  const spots: Px[] = [[-1, 3], [16, 6], [0, 13], [15, 1], [17, 12], [-2, 8], [8, -1]]
  return spots
    .slice(0, count)
    .map(
      ([x, y], i) =>
        `<rect x="${x}" y="${y}" width="1" height="1" fill="${color}" opacity="0">` +
        `<animate attributeName="opacity" values="0;1;0" dur="2.4s" begin="${(i * 0.37).toFixed(2)}s" repeatCount="indefinite"/></rect>`,
    )
    .join('')
}

const SPARKLES: Record<Rarity, number> = { common: 0, uncommon: 0, rare: 2, legendary: 4 }

export function buddySvg(opts: { species: SpeciesName; mood: Face; stage: Stage; rarity: Rarity; wearing: ItemId | null }): string {
  const sp: Species = SPECIES[opts.species]
  const glad = opts.mood === 'happy' || opts.mood === 'love'
  const bob = glad ? '0 0;0 -1.2;0 0' : '0 0;0 0.4;0 0'
  const pixels = itemOf(opts.wearing)?.pixels
  const sparkleCount = SPARKLES[opts.rarity] + (opts.stage === 'radiant' ? 3 : 0)
  const sparkleColor = opts.stage === 'radiant' || opts.rarity === 'legendary' ? '#ffd54f' : '#80deea'
  const body =
    grid(sp.rows, sp.palette) +
    face(sp, opts.mood) +
    (pixels ? grid(pixels.rows, pixels.colors) : '') +
    (opts.wearing === 'sunglasses' ? sunglasses(sp) : '') +
    (opts.stage === 'baby' ? grid(SHELL, { w: '#fff8e1', d: '#d7c39a' }) : '')
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-3 -2 22 19" shape-rendering="crispEdges">` +
    `<g><animateTransform attributeName="transform" type="translate" values="${bob}" dur="${glad ? '0.6s' : '3s'}" repeatCount="indefinite"/>${body}</g>` +
    sparkles(sparkleCount, sparkleColor) +
    `</svg>`
  )
}
