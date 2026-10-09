import type { Buddy, DayCount, Face, Progress, Rarity, Roster, SpeciesName, Stage } from '../types'

import { isLegendarySpecies, LEGENDARY_SPECIES, SPECIES_NAMES } from './art'
import { DAY_MS, type Item, ITEMS, NAMES, NIGHT_FROM, NIGHT_UNTIL, RARITY, STAGES } from './data'

// Every list passed in is a non-empty constant.
export const pick = <T,>(list: readonly T[]): T => list[Math.floor(Math.random() * list.length)] as T

export const today = (now = new Date()) => `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`
export const thisMonth = (now = new Date()) => `${now.getFullYear()}-${now.getMonth() + 1}`
export const currentMonth = (now = new Date()) => now.getMonth() + 1
export const isNight = (now = new Date()) => now.getHours() >= NIGHT_FROM || now.getHours() < NIGHT_UNTIL

export const level = (buddy: Pick<Buddy, 'xp'>) => Math.floor(Math.sqrt(buddy.xp)) + 1
export const stageOf = (lvl: number): Stage => (lvl >= STAGES.radiant.from ? 'radiant' : lvl >= STAGES.grown.from ? 'grown' : 'baby')
// "lvl 3 baby"
export const levelLabel = (buddy: Pick<Buddy, 'xp'>) => `lvl ${level(buddy)} ${STAGES[stageOf(level(buddy))].label}`
// "Mochi the rare cat ★"
export const title = (buddy: Buddy) => `${buddy.name} the ${buddy.rarity} ${buddy.species} ${RARITY[buddy.rarity].mark}`.trim()

export function rollRarity(roll = Math.random() * 100): Rarity {
  for (const rarity of Object.keys(RARITY) as Rarity[]) {
    roll -= RARITY[rarity].weight
    if (roll < 0) return rarity
  }
  return 'common'
}

// Dragons and skulls are the legendaries: a legendary roll hatches one of them, and they hatch no other way.
export function hatchRoll(roll = Math.random() * 100): { species: SpeciesName; rarity: Rarity } {
  const rarity = rollRarity(roll)
  const pool = rarity === 'legendary' ? LEGENDARY_SPECIES : SPECIES_NAMES.filter(s => !isLegendarySpecies(s))
  return { species: pick(pool), rarity }
}

// Picking a species skips the roll: an ordinary species rolls common to rare, a legendary one is legendary.
function rarityFor(species: SpeciesName): Rarity {
  if (isLegendarySpecies(species)) return 'legendary'
  const rarity = rollRarity()
  return rarity === 'legendary' ? 'rare' : rarity
}

export function hatch(species?: SpeciesName, name = pick(NAMES), now = Date.now()): Buddy {
  const rolled = species ? { species, rarity: rarityFor(species) } : hatchRoll()
  return {
    id: `${name.toLowerCase()}-${now.toString(36)}`,
    name, ...rolled, hatchedAt: now, xp: 0, pets: 0, lastPetAt: now, wearing: null,
  }
}

export function newRoster(buddy = hatch()): Roster {
  const day = today()
  return {
    version: 2,
    activeId: buddy.id,
    buddies: [buddy],
    progress: {
      stats: { tests: 0, approvals: 0, nights: 0 },
      streak: { day, count: 1, best: 1 },
      focus: { day, count: 0, best: 0 },
      items: [],
    },
    seasons: [],
  }
}

export const activeBuddy = (roster: Roster): Buddy => roster.buddies.find(b => b.id === roster.activeId) ?? (roster.buddies[0] as Buddy)

export function findBuddy(roster: Roster, name: string): Buddy | undefined {
  const wanted = name.trim().toLowerCase()
  if (!wanted) return undefined
  return roster.buddies.find(b => b.name.toLowerCase() === wanted) ?? roster.buddies.find(b => b.name.toLowerCase().startsWith(wanted))
}

// Counts today once: consecutive days grow the streak, a gap resets it to 1.
export function bumpStreak(progress: Progress, now = new Date()): Progress {
  const day = today(now)
  const { streak } = progress
  if (streak.day === day) return progress
  const count = streak.day === today(new Date(now.getTime() - DAY_MS)) ? streak.count + 1 : 1
  return { ...progress, streak: { day, count, best: Math.max(streak.best, count) } }
}

function bumpDay(counter: DayCount, now: Date): DayCount {
  const day = today(now)
  const count = counter.day === day ? counter.count + 1 : 1
  return { day, count, best: Math.max(counter.best, count) }
}

export function countTurn(progress: Progress, now = new Date()): Progress {
  const nights = progress.stats.nights + (isNight(now) ? 1 : 0)
  return bumpStreak({ ...progress, focus: bumpDay(progress.focus, now), stats: { ...progress.stats, nights } }, now)
}

export const newUnlocks = (buddy: Buddy, progress: Progress): Item[] =>
  ITEMS.filter(i => !progress.items.includes(i.id) && i.has(buddy, progress))

export function idleFace(buddy: Buddy, now = new Date()): Extract<Face, 'idle' | 'sleepy' | 'grumpy'> {
  if (isNight(now)) return 'sleepy'
  if (now.getTime() - buddy.lastPetAt > DAY_MS) return 'grumpy'
  return 'idle'
}

export function greeting(progress: Progress, now = new Date()): string {
  const hour = now.getHours()
  const hello = hour < 12 ? 'Good morning!' : hour < 17 ? 'Good afternoon!' : hour < NIGHT_FROM ? 'Evening! Working late?' : "Shouldn't we be asleep?"
  return progress.streak.count > 1 ? `${hello} Day ${progress.streak.count} in a row 🔥` : hello
}

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']
export const monthOf = (word: string) => (word ? MONTHS.findIndex(m => m.startsWith(word.toLowerCase())) + 1 : 0)
export const monthName = (n: number) => (MONTHS[n - 1] ?? '').replace(/^./, c => c.toUpperCase())
