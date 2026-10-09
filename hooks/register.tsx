// Everything that talks to Claude Code lives in this file: the engine's `$` can only be handed to
// functions declared here. The rules, art and text it uses are plain functions in the other files.

import { type EngineInterface, type Register, update } from 'claude-code'

import type { Buddy, Face, Progress, Roster, Watch } from '../types'

import { buddyAscii, buddySvg, isLegendarySpecies, isSpecies, SPECIES_NAMES } from './art'
import { ALERT_MS, BLINK_MS, type Item, itemOf, LINES, MOOD_MS, RARITY, STAGES, WATCH_MS } from './data'
import {
  activeBuddy, buildCard, bumpStreak, countTurn, currentMonth, findBuddy, greeting, hatch, idleFace,
  level, levelLabel, monthName, monthOf, newRoster, newUnlocks, pick, stageOf, thisMonth, title,
} from './pet'
import { buddyNames, cardText, chatPersona, COMMAND_DESCRIPTION, leaderboardText, parseCommand, wardrobeText } from './text'
import { HABITS, WORKING } from './vocab'
import { calendarWindow, prChanges, prQuery, slackMentions, slackUserId, upcomingMeetings } from './watch'

const ROSTER = { plugin: 'buddy', key: 'roster' } as const
const MOOD = { plugin: 'buddy', key: 'mood' } as const
const BLINK = { plugin: 'buddy', key: 'isBlinking' } as const
const HIDDEN = { plugin: 'buddy', key: 'isHidden' } as const
const WATCH = { plugin: 'buddy', key: 'watch' } as const
const STORE_KEY = 'roster'
const MAX_NAME = 24
// How many Slack and Calendar alerts to remember so they aren't repeated.
const SEEN_MAX = 200

type Config = { githubOrg: string; leagueUrl: string; watchSlack: boolean; watchCalendar: boolean }

// ── Roster and mood ──────────────────────────────────────────────────────────

async function getRoster($: EngineInterface): Promise<Roster | undefined> {
  return (await $.state.get(ROSTER)).value ?? undefined
}

async function saveRoster($: EngineInterface, roster: Roster) {
  await $.state.set(ROSTER, roster)
  await $.store.set(STORE_KEY, roster)
}

// Shows a face and line in the band. `ifIdle` lets an urgent line already showing finish first.
async function say($: EngineInterface, face: Face, line?: string, { ms = MOOD_MS, ifIdle = false } = {}) {
  if (ifIdle) {
    const { value: mood } = await $.state.get(MOOD)
    if (mood && mood.until > Date.now() && mood.face !== 'busy' && mood.face !== 'idle') return
  }
  await $.state.set(MOOD, { face, line, until: Date.now() + ms })
}

// A toast plus a line that lingers in the band.
async function notify($: EngineInterface, face: Face, line: string) {
  $.ui.toast(line)
  await say($, face, line, { ms: ALERT_MS })
}

type Edit = { buddy?: (buddy: Buddy) => Buddy; progress?: (progress: Progress) => Progress }

// Every change to the active buddy or your progress goes through here, so unlocks and growing up are noticed in one place.
async function edit($: EngineInterface, change: Edit) {
  let was: Buddy | undefined
  let now: Buddy | undefined
  let unlocked: Item[] = []
  const roster = await update($, ROSTER, current => {
    if (!current) return null
    const before = activeBuddy(current)
    const buddy = change.buddy ? change.buddy(before) : before
    let progress = change.progress ? change.progress(current.progress) : current.progress
    unlocked = newUnlocks(buddy, progress)
    if (unlocked.length) progress = { ...progress, items: [...progress.items, ...unlocked.map(i => i.id)] }
    const after: Buddy = { ...buddy, id: before.id, wearing: unlocked.at(-1)?.id ?? buddy.wearing }
    ;[was, now] = [before, after]
    return { ...current, progress, buddies: current.buddies.map(b => (b.id === after.id ? after : b)) }
  })
  if (!roster || !was || !now) return
  await $.store.set(STORE_KEY, roster)

  for (const item of unlocked) {
    $.ui.toast(`🎁 ${now.name} unlocked a ${item.name} ${item.emoji} (${item.hint})`)
    await say($, 'love', `Ooh, a ${item.name}! ${item.emoji}`, { ms: 15000 })
  }
  const [from, to] = [stageOf(level(was)), stageOf(level(now))]
  if (from !== to) {
    $.ui.toast(`✨ ${now.name} is all ${STAGES[to].label} now! (level ${level(now)})`)
    await say($, 'love', to === 'radiant' ? 'I feel... sparkly ✨' : 'Look how big I got!', { ms: 20000 })
  }
}

async function petBuddy($: EngineInterface) {
  await edit($, { buddy: b => ({ ...b, pets: b.pets + 1, lastPetAt: Date.now() }) })
  await say($, 'love', pick(LINES.pet))
}

async function switchTo($: EngineInterface, id: string, why: string) {
  const roster = await getRoster($)
  if (!roster || roster.activeId === id) return
  const leaving = activeBuddy(roster)
  const next = { ...roster, activeId: id }
  await saveRoster($, next)
  const arriving = activeBuddy(next)
  $.ui.toast(`👋 ${leaving.name} is resting. ${arriving.name} the ${arriving.species} is here! (${why})`)
  await say($, 'love', `Hi! It's me, ${arriving.name}!`, { ms: 15000 })
}

// On the first session of a month with a seasonal buddy, that buddy takes over once.
async function applySeason($: EngineInterface) {
  const roster = await getRoster($)
  if (!roster || roster.seasonApplied === thisMonth()) return
  await saveRoster($, { ...roster, seasonApplied: thisMonth() })
  const rule = roster.seasons.find(r => r.month === currentMonth())
  if (rule && roster.buddies.some(b => b.id === rule.id)) await switchTo($, rule.id, `${monthName(rule.month)} buddy`)
}

// Kept for a daily "post buddy to the league" scheduled task, so only written when a league is set.
async function writeCardFile($: EngineInterface, config: Config) {
  if (!config.leagueUrl) return
  const roster = await getRoster($)
  const home = await $.env.get('HOME')
  if (!roster || !home) return
  await $.fs.write(`${home}/.claude/buddy/card.json`, JSON.stringify(buildCard(roster), null, 2))
}

// What buddy is up to while Claude works: usually a spinner verb, sometimes its own species' habit.
async function doing($: EngineInterface): Promise<string> {
  const roster = await getRoster($)
  const habits = roster ? HABITS[activeBuddy(roster).species] : []
  return `*${habits.length && Math.random() < 0.4 ? pick(habits) : pick(WORKING)}…*`
}

// Blinks, and once a line has had its time, lets buddy settle back to idle (sometimes with a mumble).
async function tick($: EngineInterface) {
  const { value: isBlinking } = await $.state.get(BLINK)
  await $.state.set(BLINK, !isBlinking)
  const { value: mood } = await $.state.get(MOOD)
  const roster = await getRoster($)
  if (!roster || !mood || mood.until >= Date.now() || mood.face === 'idle') return
  const buddy = activeBuddy(roster)
  const face = idleFace(buddy)
  let line: string | undefined
  if (Math.random() < 0.3) {
    if (face !== 'idle') line = pick(LINES[face])
    else line = Math.random() < 0.5 ? `*${pick(HABITS[buddy.species])}…*` : pick(LINES.idle)
  }
  await $.state.set(MOOD, { face: 'idle', line, until: 0 })
}

// ── Watchers ─────────────────────────────────────────────────────────────────

const emptyWatch = (): Watch => ({ prDecisions: null, slackSince: Math.floor(Date.now() / 1000), seen: [], needsPermission: [] })

async function getWatch($: EngineInterface): Promise<Watch> {
  return (await $.state.get(WATCH)).value ?? emptyWatch()
}

// Read, change and write in one step, so watchers don't drop each other's writes.
async function updateWatch($: EngineInterface, change: (watch: Watch) => Watch) {
  await update($, WATCH, w => change(w ?? emptyWatch()))
}

// Alerts once for each key it hasn't alerted for before.
async function alertNew($: EngineInterface, alerts: { key: string; line: string }[]) {
  const { seen } = await getWatch($)
  const fresh = alerts.filter(a => !seen.includes(a.key))
  if (!fresh.length) return
  await updateWatch($, w => ({ ...w, seen: [...w.seen, ...fresh.map(a => a.key)].slice(-SEEN_MAX) }))
  for (const a of fresh) await notify($, 'busy', a.line)
}

// Calls a connector tool only when settings already allow it, so polling never opens a permission dialog.
async function callAllowed($: EngineInterface, tool: string, input: Record<string, unknown>) {
  const { decision } = await $.tool.check({ tool, input })
  const short = tool.split('__').pop() ?? tool
  await updateWatch($, w => ({
    ...w,
    needsPermission: [...w.needsPermission.filter(t => t !== short), ...(decision === 'allow' ? [] : [short])],
  }))
  if (decision !== 'allow') return undefined
  // The tool is found by name at run time, so its input can't be checked against its type here.
  const ran = await $.tool.call({ tool, ...input } as Parameters<EngineInterface['tool']['call']>[0])
  if (ran.deny !== undefined || ran.isError) return undefined
  return ran.text ?? (typeof ran.result === 'string' ? ran.result : JSON.stringify(ran.result))
}

async function checkPrs($: EngineInterface, config: Config) {
  const { exitCode, stdout } = await $.process.run(['gh', 'api', 'graphql', '-f', `query=${prQuery(config.githubOrg)}`])
  if (exitCode !== 0) return
  const { prDecisions } = await getWatch($)
  const { decisions, changes } = prChanges(stdout, prDecisions)
  await updateWatch($, w => ({ ...w, prDecisions: decisions }))
  for (const { label, decision } of changes) {
    if (decision === 'CHANGES_REQUESTED') {
      await notify($, 'sad', `Changes requested on ${label}.`)
      continue
    }
    await notify($, 'love', `${label} got approved! 🎉`)
    await edit($, { progress: p => ({ ...p, stats: { ...p.stats, approvals: p.stats.approvals + 1 } }) })
  }
}

async function checkSlack($: EngineInterface) {
  const tool = (await $.tool.list()).find(t => t.name.endsWith('__slack_search_public_and_private'))
  const userId = tool && slackUserId(tool.description)
  if (!tool || !userId) return
  const startedAt = Math.floor(Date.now() / 1000)
  const { slackSince } = await getWatch($)
  const text = await callAllowed($, tool.name, {
    query: `<@${userId}>`,
    after: String(slackSince - 60),
    sort: 'timestamp',
    limit: 10,
    include_context: false,
    response_format: 'concise',
  })
  if (text === undefined) return
  await alertNew($, slackMentions(text))
  await updateWatch($, w => ({ ...w, slackSince: startedAt }))
}

async function checkCalendar($: EngineInterface) {
  const tool = (await $.tool.list()).find(t => t.name.endsWith('__list_events') && /calendar/i.test(t.description))
  if (!tool) return
  const now = Date.now()
  const text = await callAllowed($, tool.name, { ...calendarWindow(now), orderBy: 'startTime', pageSize: 10 })
  if (text !== undefined) await alertNew($, upcomingMeetings(text, now))
}

const errorText = (err: unknown) => (err instanceof Error ? err.message : String(err))

// Each watcher runs on its own so one failing (offline, connector down) doesn't stop the others.
async function runWatchers($: EngineInterface, config: Config) {
  await checkPrs($, config).catch(err => $.ui.log(`PR watcher failed: ${errorText(err)}`, { to: 'debug' }))
  if (config.watchSlack) await checkSlack($).catch(err => $.ui.log(`Slack watcher failed: ${errorText(err)}`, { to: 'debug' }))
  if (config.watchCalendar) await checkCalendar($).catch(err => $.ui.log(`Calendar watcher failed: ${errorText(err)}`, { to: 'debug' }))
}

// ── /buddy ───────────────────────────────────────────────────────────────────

async function chat($: EngineInterface, roster: Roster, buddy: Buddy, message: string): Promise<string> {
  const { value: mood } = await $.state.get(MOOD)
  const system = chatPersona(roster, buddy, mood?.face ?? 'idle')
  const r = await $.model.complete({ model: 'haiku', system, prompt: message, maxTokens: 120, effort: 'low', timeoutMs: 20000 })
  return r.isAnswered && r.text ? r.text.trim() : ''
}

async function runCommand($: EngineInterface, input: string, roster: Roster, config: Config): Promise<string> {
  const { verb, args, rest } = parseCommand(input)
  const buddy = activeBuddy(roster)

  switch (verb) {
    case 'pet':
      await petBuddy($)
      return `You pet ${buddy.name}.`

    case 'chat': {
      if (!rest) return `Say something to ${buddy.name}: /buddy chat <message>`
      await say($, 'busy', '...', { ms: 20000 })
      const reply = await chat($, roster, buddy, rest)
      if (!reply) {
        await say($, 'sleepy', '*mumbles something sleepy*')
        return `${buddy.name} is too sleepy to talk right now (the model didn't answer).`
      }
      await say($, 'happy', reply, { ms: 25000 })
      return `${buddy.name}: ${reply}`
    }

    case 'items':
      return wardrobeText(roster, buddy)

    case 'wear': {
      if (args[0] === 'none') {
        await edit($, { buddy: b => ({ ...b, wearing: null }) })
        return `${buddy.name} took everything off.`
      }
      const item = itemOf(args[0])
      if (!item || !roster.progress.items.includes(item.id)) return `${buddy.name} hasn't unlocked that yet. See /buddy items.`
      await edit($, { buddy: b => ({ ...b, wearing: item.id }) })
      await say($, 'love', `How do I look? ${item.emoji}`)
      return `${buddy.name} is wearing the ${item.name}.`
    }

    case 'adopt': {
      const [species = '', ...nameWords] = args
      const adoptable = SPECIES_NAMES.filter(s => !isLegendarySpecies(s))
      if (isSpecies(species) && isLegendarySpecies(species)) return `${species[0]?.toUpperCase()}${species.slice(1)}s can't be adopted. They only hatch on their own, as legendaries.`
      if (!isSpecies(species)) return `Adopt which kind? /buddy adopt <species> [name], one of: ${adoptable.join(', ')}`
      const name = nameWords.join(' ').slice(0, MAX_NAME) || undefined
      if (name && roster.buddies.some(b => b.name.toLowerCase() === name.toLowerCase())) return `You already have a buddy called ${name}.`
      const baby = hatch(species, name)
      await saveRoster($, { ...roster, buddies: [...roster.buddies, baby] })
      await switchTo($, baby.id, 'just hatched')
      return `🥚 ${title(baby)} hatched and joined the roster! Switch back any time with /buddy switch ${buddy.name}.`
    }

    case 'switch': {
      const target = findBuddy(roster, rest)
      if (!target) return `Switch to who? Your buddies: ${buddyNames(roster)}`
      if (target.id === roster.activeId) return `${target.name} is already here.`
      await switchTo($, target.id, 'you picked them')
      return `Switched to ${target.name}.`
    }

    case 'leaderboard':
      return leaderboardText(roster)

    case 'season': {
      const [monthWord = '', ...nameWords] = args
      const month = monthOf(monthWord)
      const name = nameWords.join(' ')
      if (!month) return 'Usage: /buddy season <month> <name>, or /buddy season <month> off. See them all with /buddy leaderboard.'
      const others = roster.seasons.filter(r => r.month !== month)
      if (name.toLowerCase() === 'off') {
        await saveRoster($, { ...roster, seasons: others })
        return `${monthName(month)} no longer has a seasonal buddy.`
      }
      const target = findBuddy(roster, name)
      if (!target) return `Which buddy for ${monthName(month)}? Your buddies: ${buddyNames(roster)}`
      // Clearing seasonApplied lets a rule for the current month take effect right away.
      const isNow = month === currentMonth()
      await saveRoster($, { ...roster, seasons: [...others, { month, id: target.id }], seasonApplied: isNow ? undefined : roster.seasonApplied })
      if (isNow) await applySeason($)
      return `${target.name} is now your ${monthName(month)} buddy${isNow ? ' and moved in for the rest of this month' : ''}.`
    }

    case 'share': {
      const text = `buddy-card ${JSON.stringify(buildCard(roster))}`
      const where = config.leagueUrl ? `the Buddy League: ${config.leagueUrl}` : "your Buddy League page (set its URL in the plugin's settings)"
      await writeCardFile($, config).catch(() => undefined)
      const copied = await $.ui.copy({ text })
      await say($, 'love', "Show them who's boss! 🏆")
      return copied.isCopied
        ? `Copied ${buddy.name}'s buddy card. Paste it into ${where}`
        : `Couldn't reach the clipboard. Copy this line and paste it into ${where}\n${text}`
    }

    case 'rename': {
      if (!rest) return `Rename ${buddy.name} to what? /buddy rename <name>`
      const name = rest.slice(0, MAX_NAME)
      await edit($, { buddy: b => ({ ...b, name }) })
      await say($, 'happy', `${name}? I love it!`)
      return `Your buddy is now called ${name}.`
    }

    case 'hide':
      await $.state.set(HIDDEN, true)
      return `${buddy.name} is napping out of sight.`

    case 'show':
      await $.state.set(HIDDEN, false)
      return `${buddy.name} is back!`

    case undefined: {
      await $.state.set(HIDDEN, false)
      const { needsPermission } = await getWatch($)
      return cardText(roster, buddy, needsPermission)
    }
  }
}

// ── Hooks ────────────────────────────────────────────────────────────────────

export const register: Register = (on, options) => {
  const config: Config = {
    githubOrg: String(options.githubOrg ?? '').trim(),
    leagueUrl: String(options.leagueUrl ?? '').trim(),
    watchSlack: options.watchSlack === true,
    watchCalendar: options.watchCalendar === true,
  }

  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'buddy', description: COMMAND_DESCRIPTION })
    // Saves from before version 2 are ignored, and a fresh buddy hatches.
    const stored = (await $.store.get(STORE_KEY)) as Roster | undefined
    let roster = stored?.version === 2 ? stored : undefined
    if (!roster) {
      roster = newRoster()
      $.ui.toast(`🥚 Your buddy hatched: ${title(activeBuddy(roster))}!`)
    }
    await saveRoster($, roster)
    await applySeason($)
    await edit($, { progress: p => bumpStreak(p) })
    const saved = await getRoster($)
    if (saved) await say($, 'happy', greeting(saved.progress), { ms: 12000 })

    void writeCardFile($, config).catch(() => undefined)
    void runWatchers($, config)
    $.clock.every(WATCH_MS, () => void runWatchers($, config))
    $.clock.every(BLINK_MS, () => tick($))
    return next(e)
  })

  on('command.run', { command: 'buddy' }, async ($, e) => {
    const roster = await getRoster($)
    if (!roster) return { text: 'No buddy yet.' }
    return { text: await runCommand($, e.args, roster, config) }
  })

  on('prompt.submit', async ($, e, next) => {
    await say($, 'happy', Math.random() < 0.5 ? await doing($) : pick(LINES.prompt))
    return next(e)
  })

  on('tool.call', async ($, e, next) => {
    const ran = await next(e)
    if (ran.deny === undefined && ran.isError === true) {
      await say($, 'sad', pick(LINES.fail).replace('{tool}', e.tool))
    } else if (e.tool === 'Edit' || e.tool === 'Write') {
      await say($, 'busy', await doing($), { ifIdle: true })
    }
    return ran
  })

  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    const ran = await next(e)
    const isTest = typeof e.command === 'string' && /\b(test|jest|vitest|pytest|playwright)\b/.test(e.command)
    if (isTest && ran.deny === undefined && ran.isError !== true) {
      await edit($, { progress: p => ({ ...p, stats: { ...p.stats, tests: p.stats.tests + 1 } }) })
      await say($, 'happy', pick(LINES.tests))
    }
    return ran
  })

  on('turn.complete', async ($, e, next) => {
    await edit($, { buddy: b => ({ ...b, xp: b.xp + 1 }), progress: p => countTurn(p) })
    await say($, 'happy', pick(LINES.done), { ifIdle: true })
    await writeCardFile($, config).catch(() => undefined)
    return next(e)
  })

  // The band above the prompt: art, name, streak, current line, and pet/hide buttons.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const roster = await getRoster($)
    const { value: isHidden } = await $.state.get(HIDDEN)
    if (!roster || isHidden || e.props.hasSurvey) return next(e)

    const buddy = activeBuddy(roster)
    const { streak } = roster.progress
    const { value: mood = { face: 'idle', until: 0 } } = await $.state.get(MOOD)
    const face = mood.face === 'idle' ? idleFace(buddy) : mood.face
    const rarity = RARITY[buddy.rarity]
    const els = $.ui.resolve(e)
    const { Box, Text, Button } = els

    let art
    // The terminal's element table answers `'Svg' in els` too but draws nothing, so pick by surface.
    if (e.surface !== 'terminal' && 'Svg' in els) {
      const { Svg } = els
      art = (
        <Svg
          source={buddySvg({ species: buddy.species, mood: face, stage: stageOf(level(buddy)), rarity: buddy.rarity, wearing: buddy.wearing })}
          alt={`${buddy.name} the ${buddy.species}, feeling ${face}`}
          width={66}
          height={57}
          isInteractive
        />
      )
    } else {
      // Read only here, so the desktop's animated SVG isn't redrawn every blink.
      const { value: isBlinking } = await $.state.get(BLINK)
      art = (
        <Box flexDirection="column">
          {buddyAscii(buddy.species, face === 'idle' && isBlinking ? 'blink' : face).map((row, i) => (
            <Text key={`art-${i}`} color={rarity.color}>
              {row}
            </Text>
          ))}
        </Box>
      )
    }

    return (
      <Box flexDirection="row" gap={2}>
        {art}
        <Box flexDirection="column">
          <Text>
            <Text bold>{buddy.name}</Text>
            <Text dimColor>
              {' '}the {buddy.species} {rarity.mark} {itemOf(buddy.wearing)?.emoji ?? ''} · {levelLabel(buddy)} ·{' '}
            </Text>
            <Text bold color="#ff9800">
              🔥 {streak.count}-day streak
            </Text>
            {streak.best > streak.count && <Text dimColor> (best {streak.best})</Text>}
          </Text>
          <Text italic dimColor={!mood.line} wrap="wrap">
            {mood.line ? `“${mood.line}”` : ' '}
          </Text>
          <Box flexDirection="row" gap={1}>
            <Button key="pet" plain dimColor onPress={() => petBuddy($)}>
              pet
            </Button>
            <Button key="hide" plain dimColor onPress={() => void $.state.set(HIDDEN, true)}>
              hide
            </Button>
          </Box>
        </Box>
      </Box>
    )
  })
}
