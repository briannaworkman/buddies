import { expect, test } from 'claude-code/testing'

import { COMMAND_DESCRIPTION, parseCommand } from '../hooks/text'
import { prChanges, slackMentions, slackUserId, upcomingMeetings } from '../hooks/watch'

const prs = (...nodes: [number, string | null][]) =>
  JSON.stringify({ data: { search: { nodes: nodes.map(([n, d]) => ({ url: `u/${n}`, number: n, reviewDecision: d, repository: { name: 'buddy' } })) } } })

test('the first PR check only records where each PR stands', () => {
  const { decisions, changes } = prChanges(prs([1, 'APPROVED']), null)
  expect(decisions).toEqual({ 'u/1': 'APPROVED' })
  expect(changes).toEqual([])
})

test('PRs that newly get approved or changes requested are reported', () => {
  const before = { 'u/1': 'NONE', 'u/2': 'NONE', 'u/3': 'APPROVED' }
  const { changes } = prChanges(prs([1, 'APPROVED'], [2, 'CHANGES_REQUESTED'], [3, 'APPROVED'], [4, 'REVIEW_REQUIRED']), before)
  expect(changes).toEqual([
    { label: 'buddy#1', decision: 'APPROVED' },
    { label: 'buddy#2', decision: 'CHANGES_REQUESTED' },
  ])
})

test('Slack mentions are read from concise results', () => {
  expect(slackUserId('Search Slack. The current user_id is U0ABC123.')).toBe('U0ABC123')
  const results = 'Found 2\n1. #general - Sam Lee: hey <@U0ABC123> 2026-10-08 10:00:00\n2. #random - : ping 2026-10-08 11:00:00'
  expect(slackMentions(JSON.stringify({ results }))).toEqual([
    { key: 'slack:#general:2026-10-08 10:00:00', line: 'You were mentioned in #general by Sam Lee.' },
    { key: 'slack:#random:2026-10-08 11:00:00', line: 'You were mentioned in #random.' },
  ])
})

test('meetings warn soon and now, skipping cancelled, declined and long-started ones', () => {
  const now = Date.parse('2026-10-08T10:00:00Z')
  const at = (mins: number) => ({ dateTime: new Date(now + mins * 60000).toISOString() })
  const events = [
    { id: 'a', summary: 'Standup', start: at(5) },
    { id: 'b', summary: 'Retro', start: at(0) },
    { id: 'c', summary: 'Gone', start: at(5), status: 'cancelled' },
    { id: 'd', summary: 'Nope', start: at(5), attendees: [{ self: true, responseStatus: 'declined' }] },
    { id: 'e', summary: 'Old', start: at(-10) },
  ]
  expect(upcomingMeetings(JSON.stringify({ events }), now)).toEqual([
    { key: 'cal:a:soon', line: '📅 Standup in 5 min.' },
    { key: 'cal:b:now', line: '📅 Retro is starting now!' },
  ])
})

test('commands parse aliases and fall back to the card', () => {
  expect(parseCommand('say hi there')).toEqual({ verb: 'chat', args: ['hi', 'there'], rest: 'hi there' })
  expect(parseCommand('roster').verb).toBe('roster')
  expect(parseCommand('').verb).toBeUndefined()
  expect(parseCommand('dance').verb).toBeUndefined()
  expect(COMMAND_DESCRIPTION).toContain('adopt <species> [name]')
})
