// The buddy card: what /buddy share copies and a leaderboard page posts. Pure, so the plugin
// and the leaderboard page (leaderboard/page.ts) read and write exactly the same format.

import type { ItemId, Rarity, Roster, SpeciesName } from '../types'

import { isSpecies } from './art'
import { ITEMS, RARITY } from './data'

export const CARD_PREFIX = 'buddy-card '
const MAX_BUDDIES = 50
const MAX_NAME = 24

export type CardBuddy = { name: string; species: SpeciesName; rarity: Rarity; xp: number; pets: number; wearing: ItemId | null; active: boolean }

export type Card = {
  v: 2
  // A random id made once per person, so their leaderboard entry is the same every time they post.
  id: string
  buddies: CardBuddy[]
  streak: { count: number; best: number }
  items: ItemId[]
  at: number
}

export const newCardId = () => `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`

export function buildCard(roster: Roster, now = Date.now()): Card {
  return {
    v: 2,
    id: roster.cardId ?? newCardId(),
    buddies: roster.buddies.map(b => ({
      name: b.name, species: b.species, rarity: b.rarity, xp: b.xp, pets: b.pets,
      wearing: b.wearing, active: b.id === roster.activeId,
    })),
    streak: { count: roster.progress.streak.count, best: roster.progress.streak.best },
    items: roster.progress.items,
    at: now,
  }
}

export const cardLine = (card: Card) => CARD_PREFIX + JSON.stringify(card)

const isItemId = (x: unknown): x is ItemId => typeof x === 'string' && ITEMS.some(i => i.id === x)
const count = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) && x >= 0 ? Math.min(Math.floor(x), 1e9) : undefined)

export type ParseResult = { card: Card } | { error: string }

// Reads a pasted card. Anything that doesn't look exactly like a card is refused, since
// whatever passes here is shown to everyone on the leaderboard.
export function parseCard(text: string): ParseResult {
  const trimmed = text.trim()
  if (!trimmed.startsWith(CARD_PREFIX.trim())) return { error: 'That doesn’t look like a buddy card. Run /buddy share in Claude Code and paste what it copies.' }
  let raw: unknown
  try {
    raw = JSON.parse(trimmed.slice(CARD_PREFIX.trim().length))
  } catch {
    return { error: 'That card is incomplete. Copy it again with /buddy share and paste the whole line.' }
  }
  const c = raw as Record<string, unknown>
  if (c?.v === 1) return { error: 'That card is from an older version of Buddies. Update the plugin, then run /buddy share again.' }
  if (c?.v !== 2 || typeof c.id !== 'string' || !/^c-[a-z0-9-]{4,40}$/.test(c.id)) return { error: 'That card isn’t one this leaderboard can read. Run /buddy share again and paste the new card.' }
  if (!Array.isArray(c.buddies) || !c.buddies.length || c.buddies.length > MAX_BUDDIES) return { error: 'That card has no buddies on it.' }

  const buddies: CardBuddy[] = []
  for (const b of c.buddies as Record<string, unknown>[]) {
    const xp = count(b?.xp)
    const pets = count(b?.pets)
    const name = typeof b?.name === 'string' ? b.name.trim().slice(0, MAX_NAME) : ''
    if (!name || !isSpecies(String(b?.species)) || !(String(b?.rarity) in RARITY) || xp === undefined || pets === undefined) {
      return { error: 'Part of that card is damaged. Copy it again with /buddy share.' }
    }
    buddies.push({
      name, species: b.species as SpeciesName, rarity: b.rarity as Rarity, xp, pets,
      wearing: isItemId(b.wearing) ? b.wearing : null, active: b.active === true,
    })
  }
  if (!buddies.some(b => b.active)) (buddies[0] as CardBuddy).active = true
  const streak = c.streak as Record<string, unknown> | undefined
  return {
    card: {
      v: 2,
      id: c.id,
      buddies,
      streak: { count: count(streak?.count) ?? 0, best: count(streak?.best) ?? 0 },
      items: Array.isArray(c.items) ? [...new Set(c.items.filter(isItemId))] : [],
      at: count(c.at) ?? 0,
    },
  }
}
