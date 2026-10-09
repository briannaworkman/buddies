// Pure parsing for the PR, Slack and Calendar watchers; register.tsx does the calls.

import { MEETING_SOON_MIN } from './data'

export type Alert = { key: string; line: string }

export const prQuery = (org: string) => `query {
  search(query: "is:pr is:open ${org ? `org:${org} ` : ''}author:@me archived:false", type: ISSUE, first: 30) {
    nodes { ... on PullRequest { url number reviewDecision repository { name } } }
  }
}`

type PullRequest = { url: string; number: number; reviewDecision: string | null; repository: { name: string } }
export type PrChange = { label: string; decision: 'APPROVED' | 'CHANGES_REQUESTED' }

// Where each PR stands now, and which ones newly got approved or had changes requested since `before`.
// With no `before` (the first check) nothing counts as a change.
export function prChanges(graphql: string, before: Record<string, string> | null) {
  const prs: PullRequest[] = JSON.parse(graphql).data.search.nodes
  const decisions = Object.fromEntries(prs.map(pr => [pr.url, pr.reviewDecision ?? 'NONE']))
  const changes: PrChange[] = []
  for (const pr of before ? prs : []) {
    const now = decisions[pr.url]
    if (before?.[pr.url] === now || (now !== 'APPROVED' && now !== 'CHANGES_REQUESTED')) continue
    changes.push({ label: `${pr.repository.name}#${pr.number}`, decision: now })
  }
  return { decisions, changes }
}

// The Slack connector's description names the signed-in user.
export const slackUserId = (description: string) => description.match(/user_id is (U[A-Z0-9]+)/)?.[1]

// Concise search results are numbered entries: "1. #channel - Author: … 2026-01-02 10:00:00".
export function slackMentions(text: string): Alert[] {
  return String(JSON.parse(text).results ?? '')
    .split(/\n(?=\d+\. )/)
    .slice(1)
    .flatMap(chunk => {
      const head = chunk.match(/^\d+\. (\S+) - ([^:]*):/)
      const stamp = chunk.match(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/g)?.pop()
      if (!head?.[1] || !stamp) return []
      const author = (head[2] ?? '').trim()
      return [{ key: `slack:${head[1]}:${stamp}`, line: `You were mentioned in ${head[1]}${author ? ` by ${author}` : ''}.` }]
    })
}

type CalendarEvent = {
  id: string
  summary?: string
  status?: string
  start?: { dateTime?: string }
  attendees?: { self?: boolean; responseStatus?: string }[]
}

export const calendarWindow = (now: number) => ({
  startTime: new Date(now - 3 * 60000).toISOString(),
  endTime: new Date(now + MEETING_SOON_MIN * 60000).toISOString(),
})

// Meetings you haven't declined that start soon or just started; each warns once "soon" and once "now".
export function upcomingMeetings(text: string, now: number): Alert[] {
  const events: CalendarEvent[] = JSON.parse(text).events ?? []
  return events.flatMap(ev => {
    const start = Date.parse(ev.start?.dateTime ?? '')
    const me = ev.attendees?.find(a => a.self)
    if (Number.isNaN(start) || ev.status === 'cancelled' || me?.responseStatus === 'declined') return []
    const mins = Math.round((start - now) / 60000)
    if (mins < -3) return []
    return mins <= 0
      ? [{ key: `cal:${ev.id}:now`, line: `📅 ${ev.summary} is starting now!` }]
      : [{ key: `cal:${ev.id}:soon`, line: `📅 ${ev.summary} in ${mins} min.` }]
  })
}
