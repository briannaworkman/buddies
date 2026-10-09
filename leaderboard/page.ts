// The leaderboard page's script. scripts/build-leaderboard.mjs bundles it, with the plugin's own sprite
// and card code, into leaderboard/leaderboard.html, which /buddy:new-leaderboard publishes as an artifact.
//
// Data (the artifact's db): members/<card id> holds each person's latest card and the name
// they post under; meta/leaderboard holds the leaderboard's name, which only the owner and editors change.

import { buddySvg } from '../hooks/art'
import { type Card, type CardBuddy, parseCard } from '../hooks/card'
import { ITEMS, RARITY } from '../hooks/data'
import { level, levelLabel, stageOf } from '../hooks/pet'

type Member = { card: Card; player: string; postedAt: number }
type DbError = { code: string; message: string }

declare const claude: { use(name: string): Promise<any> }

const MINE_KEY = 'buddies-leaderboard-mine'
const MAX_PLAYER = 32
const MAX_BOARD_NAME = 48

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T
const make = (tag: string, cls?: string, text?: string) => {
  const n = document.createElement(tag)
  if (cls) n.className = cls
  if (text !== undefined) n.textContent = text
  return n
}

function readMine(): string | null {
  try {
    return localStorage.getItem(MINE_KEY)
  } catch {
    return null
  }
}
function writeMine(id: string | null) {
  try {
    if (id) localStorage.setItem(MINE_KEY, id)
    else localStorage.removeItem(MINE_KEY)
  } catch {}
}

const totalXp = (card: Card) => card.buddies.reduce((sum, b) => sum + b.xp, 0)
const activeOf = (card: Card) => card.buddies.find(b => b.active) ?? (card.buddies[0] as CardBuddy)
const hasLegendary = (card: Card) => card.buddies.some(b => b.rarity === 'legendary')
const speciesLabel = (s: string) => ({ redpanda: 'red panda', duck: 'rubber duck' })[s] ?? s

function sprite(b: CardBuddy, mood: 'idle' | 'happy' = 'idle', cls = 'sprite') {
  const el = make('div', cls)
  // Every field here came through parseCard, so the markup is built only from known species,
  // rarities and items.
  el.innerHTML = buddySvg({ species: b.species, mood, stage: stageOf(level(b)), rarity: b.rarity, wearing: b.wearing })
  el.setAttribute('role', 'img')
  el.setAttribute('aria-label', `${b.name} the ${speciesLabel(b.species)}`)
  return el
}

function ago(ms: number) {
  if (!ms) return ''
  const mins = Math.round((Date.now() - ms) / 60000)
  if (mins < 2) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours} h ago`
  const days = Math.round(hours / 24)
  return days === 1 ? 'yesterday' : `${days} days ago`
}

// Shared data is written by other people, so every member doc is re-checked before it's drawn.
function toMember(data: Record<string, unknown> | undefined): Member | undefined {
  if (!data || typeof data.card !== 'object' || !data.card) return undefined
  const parsed = parseCard(`buddy-card ${JSON.stringify(data.card)}`)
  if (!('card' in parsed)) return undefined
  const player = typeof data.player === 'string' ? data.player.trim().slice(0, MAX_PLAYER) : ''
  return { card: parsed.card, player, postedAt: typeof data.postedAt === 'number' ? data.postedAt : parsed.card.at }
}

let db: any = null
let isOwner = false
let canWrite: boolean | null = null
let members: Member[] = []
let mine = readMine()

// The pieces a podium place and a list row share.
function whoLine(m: Member) {
  const who = make('div', 'who')
  who.append(make('span', 'player', m.player || 'Someone'))
  if (m.card.id === mine) who.append(make('span', 'tag tag-you', 'you'))
  if (hasLegendary(m.card)) who.append(make('span', 'tag tag-legend', '✦ legendary'))
  return who
}

function buddyLine(lead: CardBuddy) {
  const mark = RARITY[lead.rarity].mark
  return make('div', 'buddy', `${lead.name} the ${speciesLabel(lead.species)}${mark ? ` ${mark}` : ''} · ${levelLabel(lead)}`)
}

function removeButton(m: Member) {
  if (!db || !(isOwner || m.card.id === mine)) return []
  const remove = make('button', 'remove', 'Remove') as HTMLButtonElement
  remove.type = 'button'
  remove.setAttribute('aria-label', `Remove ${m.player || 'this player'} from the leaderboard`)
  remove.addEventListener('click', () => void removeMember(m, remove))
  return [remove]
}

// 1st stands in the middle on the tallest step, 2nd to its left, 3rd to its right.
function podiumPlace(m: Member, place: number) {
  const lead = activeOf(m.card)
  const spot = make('li', `place place-${place}`)
  if (m.card.id === mine) spot.classList.add('is-mine')
  spot.setAttribute('aria-label', `${['First', 'Second', 'Third'][place - 1]} place`)
  if (place === 1) spot.append(make('div', 'crown-mark', '👑'))
  const stats = make('div', 'stats')
  stats.append(make('span', 'stat', `${totalXp(m.card)} xp`), make('span', 'stat streak', `🔥 ${m.card.streak.count}`))
  spot.append(sprite(lead, place === 1 ? 'happy' : 'idle'), whoLine(m), buddyLine(lead), stats, ...removeButton(m))
  const step = make('div', 'step')
  step.append(make('span', 'step-rank', String(place)))
  spot.append(step)
  return spot
}

function listRow(m: Member, rank: number) {
  const lead = activeOf(m.card)
  const row = make('li', 'row')
  if (m.card.id === mine) row.classList.add('is-mine')

  const info = make('div', 'info')
  const stats = make('div', 'stats')
  stats.append(
    make('span', 'stat', `${totalXp(m.card)} xp`),
    make('span', 'stat streak', `🔥 ${m.card.streak.count}`),
    make('span', 'stat', `${m.card.items.length}/${ITEMS.length} items`),
    make('span', 'stat dim', ago(m.postedAt)),
  )
  info.append(whoLine(m), buddyLine(lead), stats)

  const others = m.card.buddies.filter(b => b !== lead)
  if (others.length) {
    const shelf = make('div', 'shelf')
    shelf.append(...others.slice(0, 8).map(b => sprite(b, 'idle', 'mini')))
    if (others.length > 8) shelf.append(make('span', 'more', `+${others.length - 8}`))
    info.append(shelf)
  }

  row.append(make('div', 'rank', String(rank)), sprite(lead), info, ...removeButton(m))
  return row
}

function render() {
  const ranked = [...members].sort((a, b) => totalXp(b.card) - totalXp(a.card) || b.card.streak.count - a.card.streak.count)
  $('count').textContent = ranked.length === 1 ? '1 player' : `${ranked.length} players`
  $('empty').hidden = ranked.length > 0

  const top = ranked.slice(0, 3)
  const podium = $('podium')
  podium.hidden = top.length === 0
  // Drawn left to right as 2nd, 1st, 3rd; a missing place leaves its step empty.
  podium.replaceChildren(
    ...[2, 1, 3].map(place => {
      const m = top[place - 1]
      return m ? podiumPlace(m, place) : make('li', `place place-${place} is-empty`)
    }),
  )
  $('board').replaceChildren(...ranked.slice(3).map((m, i) => listRow(m, i + 4)))
}

function setStatus(text: string, kind: 'ok' | 'error' | '' = '') {
  const el = $('status')
  el.textContent = text
  el.dataset.kind = kind
}

async function post(event: Event) {
  event.preventDefault()
  if (!db) return
  const player = ($('player') as HTMLInputElement).value.trim().slice(0, MAX_PLAYER)
  const parsed = parseCard(($('card') as HTMLTextAreaElement).value)
  if (!player) return setStatus('Add the name you want to show on the leaderboard.', 'error')
  if ('error' in parsed) return setStatus(parsed.error, 'error')
  const button = $('post') as HTMLButtonElement
  button.disabled = true
  try {
    await db.doc(`members/${parsed.card.id}`).set({ card: parsed.card, player, postedAt: Date.now() })
    mine = parsed.card.id
    writeMine(mine)
    ;($('card') as HTMLTextAreaElement).value = ''
    setStatus(`Posted ${activeOf(parsed.card).name}. Paste a fresh card any time to update your spot.`, 'ok')
    render()
  } catch (err) {
    const code = (err as DbError)?.code
    if (code === 'invalid_argument') {
      canWrite = false
      showJoin()
      setStatus('You can see this leaderboard but not post to it yet. Ask its owner to invite you by email as an Editor.', 'error')
    } else if (code === 'quota_exceeded') {
      setStatus('This leaderboard is full. Ask its owner to remove old entries.', 'error')
    } else {
      setStatus('Couldn’t post just now. Try again in a moment.', 'error')
    }
  } finally {
    button.disabled = false
  }
}

async function removeMember(m: Member, button: HTMLButtonElement) {
  button.disabled = true
  try {
    await db.doc(`members/${m.card.id}`).delete()
    if (m.card.id === mine) {
      mine = null
      writeMine(null)
    }
  } catch {
    button.disabled = false
    setStatus('Couldn’t remove that entry. Try again in a moment.', 'error')
  }
}

function showJoin() {
  $('join-form').hidden = canWrite === false || !db
  $('join-readonly').hidden = canWrite !== false
}

// Leaderboard name: shown to everyone, editable by the owner.
function watchName() {
  db.doc('meta/leaderboard').onSnapshot(
    (snap: { exists: boolean; data(): Record<string, unknown> | undefined }) => {
      const name = snap.exists && typeof snap.data()?.name === 'string' ? String(snap.data()?.name).slice(0, MAX_BOARD_NAME) : ''
      $('leaderboard-name').textContent = name || 'Buddy Leaderboard'
      document.title = name || 'Buddy Leaderboard'
      ;($('rename-input') as HTMLInputElement).placeholder = name || 'Buddy Leaderboard'
    },
    () => undefined,
  )
}

async function rename(event: Event) {
  event.preventDefault()
  const input = $('rename-input') as HTMLInputElement
  const name = input.value.trim().slice(0, MAX_BOARD_NAME)
  if (!name) return
  try {
    await db.doc('meta/leaderboard').set({ name })
    input.value = ''
  } catch {
    setStatus('Couldn’t rename the leaderboard. Try again in a moment.', 'error')
  }
}

async function start() {
  $('join-form').addEventListener('submit', post)
  $('rename-form').addEventListener('submit', rename)
  db = await claude.use('db')
  const user = await claude.use('user')
  isOwner = (await user?.isOwner()) ?? false
  canWrite = (await user?.can('data.write')) ?? null
  $('owner-panel').hidden = !isOwner
  $('offline').hidden = Boolean(db)
  showJoin()
  if (!db) {
    $('loading').hidden = true
    return
  }
  watchName()
  db.collection('members').onSnapshot(
    (snap: { docs: { data(): Record<string, unknown> | undefined }[] }) => {
      members = snap.docs.map(d => toMember(d.data())).filter((m): m is Member => Boolean(m))
      $('loading').hidden = true
      render()
    },
    (err: DbError) => {
      $('loading').hidden = true
      if (err.code !== 'revoked') setStatus('The leaderboard stopped updating. Reload the page to see the latest.', 'error')
    },
  )
}

void start()
