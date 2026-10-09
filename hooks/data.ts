import type { Buddy, ItemId, Progress, Rarity, Stage } from '../types'

import { CHEERS, IDLE } from './vocab'

export const DAY_MS = 86400000
export const MOOD_MS = 8000
export const ALERT_MS = 45000
export const WATCH_MS = 2 * 60 * 1000
export const BLINK_MS = 3500
export const MEETING_SOON_MIN = 10
// Sleepy face and nightcap progress both count these hours as night.
export const NIGHT_FROM = 22
export const NIGHT_UNTIL = 6

export const RARITY: Record<Rarity, { weight: number; color?: string; mark: string }> = {
  common: { weight: 60, mark: '' },
  uncommon: { weight: 25, color: 'green', mark: '✧' },
  rare: { weight: 10, color: 'cyan', mark: '★' },
  legendary: { weight: 5, color: 'magenta', mark: '✦' },
}

// A new buddy hatches with one of these at random. Short and cute, and they fit any species.
export const NAMES = [
  'Pip', 'Mochi', 'Biscuit', 'Nori', 'Waffles', 'Pixel', 'Sprout', 'Bean', 'Tofu', 'Gizmo', 'Pebble', 'Noodle',
  'Dumpling', 'Pickle', 'Muffin', 'Peanut', 'Clover', 'Juniper', 'Maple', 'Fig', 'Olive', 'Pudding',
  'Sesame', 'Ziggy', 'Bubbles', 'Button', 'Cricket', 'Doodle', 'Hazel', 'Kiwi', 'Lentil', 'Marble',
  'Nugget', 'Pumpkin', 'Rascal', 'Sushi', 'Toast', 'Wobble', 'Yuzu', 'Zuzu',
]

export const LINES = {
  prompt: ['Ooh, a new task!', 'On it! Well, Claude is.', "Let's gooo", 'I believe in us.'],
  done: ['Done! Nice work.', 'Another one down!', '*happy wiggle*', ...CHEERS],
  fail: ['Ouch, {tool} failed.', 'Uh oh. {tool} did not like that.', "{tool} broke. It's fine. It's fine."],
  tests: ['Tests passed! 🎉', 'All green!', 'The tests love you.'],
  pet: ['*purrs*', 'Hehe, thank you!', '♥', '*leans into it*'],
  idle: ['...', '*hums*', '*stretches*', ...IDLE],
  sleepy: ['zZz', '*yawns*', 'Bedtime soon?'],
  grumpy: ['Hmph.', 'No pets today?', '*pointedly looks away*', '*grumbles*'],
}

export const STAGES: Record<Stage, { from: number; label: string }> = {
  baby: { from: 1, label: 'baby' },
  grown: { from: 5, label: 'grown-up' },
  radiant: { from: 10, label: 'radiant' },
}

// Accessory pixels sit on the same 16×16 grid as the buddy, one colour letter per pixel.
// Sunglasses have none here: art.ts fits them to each species' eyes.
export type Item = {
  id: ItemId
  emoji: string
  name: string
  hint: string
  has: (buddy: Buddy, progress: Progress) => boolean
  pixels?: { rows: string[]; colors: Record<string, string> }
}

export const ITEMS: Item[] = [
  {
    id: 'bow', emoji: '🎀', name: 'bow', hint: 'pet your buddy', has: b => b.pets >= 1,
    pixels: { rows: ['', '', '', '', '..........r.r', '...........r', '..........r.r'], colors: { r: '#e53935' } },
  },
  {
    id: 'nightcap', emoji: '🌙', name: 'nightcap', hint: 'finish a turn after 10pm', has: (_, p) => p.stats.nights >= 1,
    pixels: { rows: ['', '............w', '..........nn', '.......nwnn', '.....nwnwnwn'], colors: { n: '#3949ab', w: '#fafafa' } },
  },
  {
    id: 'tophat', emoji: '🎩', name: 'top hat', hint: 'get one of your PRs approved', has: (_, p) => p.stats.approvals >= 1,
    pixels: { rows: ['......kkkk', '......kkkk', '......kkkk', '......rrrr', '....kkkkkkkk'], colors: { k: '#212121', r: '#e53935' } },
  },
  {
    id: 'cap', emoji: '🧢', name: 'cap', hint: 'a 7-day streak', has: (_, p) => p.streak.best >= 7,
    pixels: { rows: ['', '', '', '.....cccccc', '....ccccccccccc'], colors: { c: '#1e88e5' } },
  },
  {
    id: 'goggles', emoji: '🥽', name: 'goggles', hint: '25 passing test runs', has: (_, p) => p.stats.tests >= 25,
    pixels: { rows: ['', '', '', '', '', '', '...ggGGggGGgg'], colors: { g: '#6d4c41', G: '#80deea' } },
  },
  {
    id: 'heart', emoji: '💗', name: 'heart badge', hint: '50 pets', has: b => b.pets >= 50,
    pixels: { rows: ['', '', '', '', '', '', '', '', '', '', '', '', '.........r.r', '.........rrr', '..........r'], colors: { r: '#e91e63' } },
  },
  {
    id: 'headphones', emoji: '🎧', name: 'headphones', hint: '20 turns in a single day', has: (_, p) => p.focus.best >= 20,
    pixels: {
      rows: ['', '', '', '....hhhhhhhh', '...h........h', '..h..........h', '..h..........h', '.cc..........cc', '.cc..........cc', '.cc..........cc'],
      colors: { h: '#424242', c: '#e53935' },
    },
  },
  { id: 'sunglasses', emoji: '😎', name: 'sunglasses', hint: 'get 3 of your PRs approved', has: (_, p) => p.stats.approvals >= 3 },
  {
    id: 'crown', emoji: '👑', name: 'crown', hint: '100 turns together', has: b => b.xp >= 100,
    pixels: { rows: ['', '', '.....y.yy.y', '.....yyyyyy', '.....yryyry'], colors: { y: '#ffca28', r: '#e53935' } },
  },
]

export const itemOf = (id: string | null | undefined) => ITEMS.find(i => i.id === id)
