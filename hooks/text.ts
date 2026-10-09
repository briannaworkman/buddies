// What /buddy prints. Pure, so register.tsx only fetches and saves.

import type { Buddy, Face, Roster } from '../types'

import { DAY_MS, ITEMS, itemOf } from './data'
import { levelLabel, monthName, title } from './pet'

export const buddyNames = (roster: Roster) => roster.buddies.map(b => b.name).join(', ')

export function cardText(roster: Roster, buddy: Buddy, needsPermission: string[], now = Date.now()) {
  const { streak, items } = roster.progress
  const days = Math.max(0, Math.floor((now - buddy.hatchedAt) / DAY_MS))
  return [
    `${title(buddy)} ${itemOf(buddy.wearing)?.emoji ?? ''}`.trim(),
    `${levelLabel(buddy)} (${buddy.xp} xp) · petted ${buddy.pets} times · ${days} days old`,
    `Streak: ${streak.count} day(s) (best ${streak.best}) · items: ${items.length}/${ITEMS.length}, see /buddy items`,
    ...(needsPermission.length ? [`Can't watch yet (needs an allow rule in settings): ${needsPermission.join(', ')}`] : []),
  ].join('\n')
}

export function wardrobeText(roster: Roster, buddy: Buddy) {
  const lines = ITEMS.map(i =>
    roster.progress.items.includes(i.id)
      ? `${i.emoji} ${i.name}${buddy.wearing === i.id ? ' (wearing)' : ''}: /buddy wear ${i.id}`
      : `🔒 ??? (${i.hint})`,
  )
  return [`${buddy.name}'s wardrobe:`, ...lines, 'Take it off: /buddy wear none'].join('\n')
}

export function rosterText(roster: Roster) {
  const medals = ['🥇', '🥈', '🥉']
  const rows = [...roster.buddies]
    .sort((a, b) => b.xp - a.xp || b.pets - a.pets)
    .map((b, i) => {
      const here = b.id === roster.activeId ? '  ← here now' : ''
      return `${medals[i] ?? `${i + 1}.`} ${title(b)} · ${levelLabel(b)} · ${b.xp} xp · ${b.pets} pets${here}`
    })
  const seasons = roster.seasons.length
    ? [...roster.seasons]
        .sort((a, b) => a.month - b.month)
        .map(r => `${monthName(r.month)} → ${roster.buddies.find(b => b.id === r.id)?.name ?? '?'}`)
        .join(' · ')
    : 'none yet (/buddy season october <name>)'
  return ['🐾 Your roster (xp is earned while a buddy is the one in your band)', ...rows, `Seasons: ${seasons}`].join('\n')
}

export function chatPersona(roster: Roster, buddy: Buddy, face: Face) {
  return [
    `You are ${buddy.name}, a tiny ${buddy.rarity} ${buddy.species} who lives above the prompt in Claude Code`,
    `and keeps your human company while they code. You're ${levelLabel(buddy)},`,
    `on a ${roster.progress.streak.count}-day streak, wearing ${itemOf(buddy.wearing)?.name ?? 'nothing'},`,
    `and feeling ${face}. Be playful, warm and a little cheeky.`,
    'Reply in one or two short sentences, plain text, no markdown, and never break character.',
  ].join(' ')
}

// Each /buddy subcommand: the verbs that call it and how it's used. The first verb is the one register.tsx handles.
export const COMMANDS = [
  { verbs: ['pet'], usage: 'pet' },
  { verbs: ['chat', 'say'], usage: 'chat <message>' },
  { verbs: ['items'], usage: 'items' },
  { verbs: ['wear'], usage: 'wear <item>' },
  { verbs: ['adopt'], usage: 'adopt <species> [name]' },
  { verbs: ['switch'], usage: 'switch <name>' },
  { verbs: ['roster'], usage: 'roster' },
  { verbs: ['season', 'seasons'], usage: 'season <month> <name>' },
  { verbs: ['share'], usage: 'share' },
  { verbs: ['leaderboard'], usage: 'leaderboard <link>' },
  { verbs: ['rename'], usage: 'rename <name>' },
  { verbs: ['hide'], usage: 'hide' },
  { verbs: ['show'], usage: 'show' },
] as const

export type Verb = (typeof COMMANDS)[number]['verbs'][0]

export const COMMAND_DESCRIPTION = `Your buddy: /buddy, ${COMMANDS.map(c => c.usage).join(', ')}`

// "/buddy say hi there" → { verb: 'chat', args: ['hi', 'there'], rest: 'hi there' }; no or unknown verb shows the card.
export function parseCommand(input: string): { verb: Verb | undefined; args: string[]; rest: string } {
  const [word = '', ...args] = input.trim().split(/\s+/)
  const command = COMMANDS.find(c => (c.verbs as readonly string[]).includes(word))
  return { verb: command?.verbs[0], args, rest: args.join(' ') }
}

// A leaderboard page's link: a claude.ai artifact URL, query and fragment dropped.
export function leaderboardLink(text: string): string | undefined {
  try {
    const url = new URL(text)
    if (url.protocol !== 'https:' || url.hostname !== 'claude.ai' || !/^\/(code\/)?artifact\/[\w-]+\/?$/.test(url.pathname)) return undefined
    return `${url.origin}${url.pathname.replace(/\/$/, '')}`
  } catch {
    return undefined
  }
}
