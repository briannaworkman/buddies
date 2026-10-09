import { expect, test } from 'claude-code/testing'

import { buildCard, cardLine, parseCard } from '../hooks/card'
import { hatch, newRoster } from '../hooks/pet'
import { leaderboardLink } from '../hooks/text'

const roster = () => {
  const r = newRoster(hatch('fox', 'Pip'))
  return { ...r, cardId: 'c-test-abc123', buddies: [...r.buddies, { ...hatch('dragon', 'Ember'), xp: 40 }] }
}

test('a shared card reads back the same', () => {
  const card = buildCard(roster(), 1000)
  const parsed = parseCard(cardLine(card))
  expect('card' in parsed && parsed.card).toEqual(card)
})

test('the card keeps the same id every time', () => {
  const r = roster()
  expect(buildCard(r).id).toBe('c-test-abc123')
  expect(buildCard(r).id).toBe(buildCard(r).id)
})

test('pasted junk and old cards are refused with a reason', () => {
  expect(parseCard('hello')).toHaveProperty('error')
  expect(parseCard('buddy-card {not json')).toHaveProperty('error')
  expect((parseCard('buddy-card {"v":1,"buddies":[]}') as { error: string }).error).toContain('older version')
})

test('a tampered card is refused', () => {
  const card = buildCard(roster())
  const bad = (change: (c: any) => void) => {
    const c = JSON.parse(JSON.stringify(card))
    change(c)
    return parseCard(cardLine(c))
  }
  expect(bad(c => (c.buddies[0].species = '<img src=x onerror=alert(1)>'))).toHaveProperty('error')
  expect(bad(c => (c.buddies[0].rarity = 'mythic'))).toHaveProperty('error')
  expect(bad(c => (c.buddies[0].xp = -5))).toHaveProperty('error')
  expect(bad(c => (c.id = '../../meta/leaderboard'))).toHaveProperty('error')
  expect(bad(c => (c.buddies = []))).toHaveProperty('error')
})

test('unknown items are dropped and names are trimmed', () => {
  const card = buildCard(roster())
  const c = JSON.parse(JSON.stringify(card))
  c.items = ['bow', 'jetpack', 'bow']
  c.buddies[0].wearing = 'jetpack'
  c.buddies[0].name = '  ' + 'x'.repeat(40)
  const parsed = parseCard(cardLine(c))
  if (!('card' in parsed)) throw new Error(parsed.error)
  expect(parsed.card.items).toEqual(['bow'])
  expect(parsed.card.buddies[0]?.wearing).toBeNull()
  expect(parsed.card.buddies[0]?.name.length).toBe(24)
})

test('leaderboard links must be claude.ai artifacts', () => {
  expect(leaderboardLink('https://claude.ai/artifact/Lvx98ShZhCXtwfjYxaS9Gs')).toBe('https://claude.ai/artifact/Lvx98ShZhCXtwfjYxaS9Gs')
  expect(leaderboardLink('https://claude.ai/code/artifact/123e4567-e89b-12d3-a456-426614174000/?x=1#y')).toBe('https://claude.ai/code/artifact/123e4567-e89b-12d3-a456-426614174000')
  expect(leaderboardLink('http://claude.ai/artifact/abc')).toBeUndefined()
  expect(leaderboardLink('https://evil.example/artifact/abc')).toBeUndefined()
  expect(leaderboardLink('not a link')).toBeUndefined()
})
