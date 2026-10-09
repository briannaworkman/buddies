import { expect, test } from 'claude-code/testing'

import type { Buddy, Progress } from '../types'

import { buddyAscii, buddySvg, SPECIES_NAMES } from '../hooks/art'
import { ITEMS } from '../hooks/data'
import { bumpStreak, countTurn, findBuddy, hatch, hatchRoll, idleFace, level, levelLabel, monthOf, newRoster, newUnlocks, rollRarity, stageOf } from '../hooks/pet'

const at = (iso: string) => new Date(iso)
const progress = (over: Partial<Progress> = {}): Progress => ({ ...newRoster().progress, ...over })
const buddy = (over: Partial<Buddy> = {}): Buddy => ({ ...hatch('cat', 'Pip'), ...over })

test('levels and stages grow with xp', () => {
  expect(level({ xp: 0 })).toBe(1)
  expect(level({ xp: 16 })).toBe(5)
  expect(stageOf(4)).toBe('baby')
  expect(stageOf(5)).toBe('grown')
  expect(stageOf(10)).toBe('radiant')
  expect(levelLabel({ xp: 81 })).toBe('lvl 10 radiant')
})

test('rarity rolls follow the weights', () => {
  expect(rollRarity(0)).toBe('common')
  expect(rollRarity(59.9)).toBe('common')
  expect(rollRarity(60)).toBe('uncommon')
  expect(rollRarity(85)).toBe('rare')
  expect(rollRarity(99.9)).toBe('legendary')
})

test('only dragons and skulls are legendary', () => {
  for (let i = 0; i < 50; i++) {
    expect(['dragon', 'skull']).toContain(hatchRoll(99.9).species)
    expect(['dragon', 'skull']).not.toContain(hatchRoll(10).species)
  }
  expect(hatchRoll(99.9).rarity).toBe('legendary')
  expect(hatch('dragon').rarity).toBe('legendary')
  for (let i = 0; i < 50; i++) expect(hatch('dog').rarity).not.toBe('legendary')
})

test('the streak grows on consecutive days and resets after a gap', () => {
  const start = progress({ streak: { day: '2026-10-7', count: 3, best: 3 } })
  const next = bumpStreak(start, at('2026-10-08T09:00:00'))
  expect(next.streak).toEqual({ day: '2026-10-8', count: 4, best: 4 })
  expect(bumpStreak(next, at('2026-10-08T18:00:00'))).toBe(next)
  expect(bumpStreak(next, at('2026-10-10T09:00:00')).streak).toEqual({ day: '2026-10-10', count: 1, best: 4 })
})

test('a turn counts focus for the day and nights after 10pm', () => {
  const day = countTurn(progress(), at('2026-10-08T14:00:00'))
  expect(day.focus.count).toBe(1)
  expect(day.stats.nights).toBe(0)
  const night = countTurn(day, at('2026-10-08T23:00:00'))
  expect(night.focus).toEqual({ day: '2026-10-8', count: 2, best: 2 })
  expect(night.stats.nights).toBe(1)
})

test('items unlock once', () => {
  const petted = buddy({ pets: 1 })
  expect(newUnlocks(petted, progress()).map(i => i.id)).toEqual(['bow'])
  expect(newUnlocks(petted, progress({ items: ['bow'] }))).toEqual([])
})

test('idle face: sleepy at night, grumpy after a day without pets', () => {
  const noon = at('2026-10-08T12:00:00')
  expect(idleFace(buddy({ lastPetAt: noon.getTime() - 1000 }), noon)).toBe('idle')
  expect(idleFace(buddy({ lastPetAt: noon.getTime() - 2 * 86400000 }), noon)).toBe('grumpy')
  expect(idleFace(buddy({ lastPetAt: noon.getTime() }), at('2026-10-08T23:30:00'))).toBe('sleepy')
})

test('buddies are found by exact name before prefix', () => {
  const roster = newRoster(buddy({ id: 'a', name: 'Pip' }))
  roster.buddies.push(buddy({ id: 'b', name: 'Pippa' }))
  expect(findBuddy(roster, 'pip')?.id).toBe('a')
  expect(findBuddy(roster, 'pipp')?.id).toBe('b')
  expect(findBuddy(roster, '')).toBeUndefined()
})

test('months match by prefix', () => {
  expect(monthOf('oct')).toBe(10)
  expect(monthOf('')).toBe(0)
  expect(monthOf('smarch')).toBe(0)
})

test('every species draws in both styles', () => {
  for (const species of SPECIES_NAMES) {
    expect(buddyAscii(species, 'happy').join('\n')).toContain('^.^')
    for (const item of ITEMS) {
      expect(buddySvg({ species, mood: 'idle', stage: 'baby', rarity: 'legendary', wearing: item.id })).toContain('<svg')
    }
  }
})
