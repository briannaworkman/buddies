import React from 'react'
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'

import type { Face, ItemId, SpeciesName } from '../../types'

import { SPECIES_NAMES, isLegendarySpecies } from '../../hooks/art'
import { ITEMS } from '../../hooks/data'
import { Footage } from './Footage'
import { Caption, Chip, Headline, usePop } from './parts'
import { Sprite } from './Sprite'
import { C, FONT, W } from './theme'

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const

// ── 1. An egg wobbles, cracks and hatches ─────────────────────────────────────

const EGG = [
  '................', '......oooo......', '.....oeeeeo.....', '....oeeseeeo....', '...oeeeeeeseo...', '...oeseeeeeeo...',
  '..oeeeeeseeeeo..', '..oeeeeeeeeeeo..', '..oeseeeeeeseo..', '..oeeeeeeeeeeo..', '..oeeeseeeeeeo..', '...oeeeeeeseo...',
  '...oeeeeeeeeo...', '....oeeeeeeo....', '.....oooooo.....', '................',
]
const EGG_COLORS: Record<string, string> = { o: '#b39a72', e: '#fff7e6', s: '#e7c98f' }

const EggHalf: React.FC<{ rows: string[]; offset: number; crack: boolean }> = ({ rows, offset, crack }) => (
  <svg viewBox={`0 ${offset} 16 ${rows.length}`} width="100%" height="100%" shapeRendering="crispEdges" style={{ display: 'block' }}>
    {rows.flatMap((row, y) => [...row].map((ch, x) => (EGG_COLORS[ch] ? <rect key={`${x}-${y}`} x={x} y={y + offset} width={1} height={1} fill={EGG_COLORS[ch]} /> : null)))}
    {crack && <polyline points={`2,${8} 4,${7} 6,${8.4} 8,${7} 10,${8.4} 12,${7} 14,${8}`} fill="none" stroke="#7a6748" strokeWidth={0.45} />}
  </svg>
)

export const Hatch: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const size = 460
  const wobble = frame < 64 ? Math.sin(frame / 3.2) * interpolate(frame, [0, 64], [3, 9], clamp) : 0
  const crack = frame >= 44
  const burst = spring({ frame: frame - 64, fps, config: { damping: 16, mass: 1.1 } })
  const pop = spring({ frame: frame - 66, fps, config: { damping: 11, mass: 0.9 } })
  const top = (1350 - size) / 2 - 40
  return (
    <AbsoluteFill>
      <Headline top={190} delay={78} size={84}>
        Meet your
        <br />
        buddy
      </Headline>
      <div style={{ position: 'absolute', left: (W - size) / 2, top, width: size, height: size, transform: `rotate(${wobble}deg)`, transformOrigin: '50% 90%' }}>
        <div style={{ position: 'absolute', left: (size - size * 0.92) / 2, top: size * 0.12, opacity: frame < 66 ? 0 : 1, transform: `scale(${0.4 + pop * 0.6})`, transformOrigin: '50% 100%' }}>
          <Sprite species="monkey" mood={frame > 95 ? 'happy' : 'love'} stage="baby" size={size * 0.92} sparkle={frame > 66 && frame < 118 ? 'gold' : 'none'} />
        </div>
        <div style={{ position: 'absolute', left: 0, top: 0, width: size, height: size / 2, transform: `translate(${-burst * 60}px, ${-burst * 260}px) rotate(${-burst * 35}deg)`, opacity: 1 - burst }}>
          <EggHalf rows={EGG.slice(0, 8)} offset={0} crack={crack} />
        </div>
        <div style={{ position: 'absolute', left: 0, top: size / 2, width: size, height: size / 2, transform: `translate(${burst * 40}px, ${burst * 160}px) rotate(${burst * 20}deg)`, opacity: 1 - burst }}>
          <EggHalf rows={EGG.slice(8)} offset={8} crack={false} />
        </div>
      </div>
    </AbsoluteFill>
  )
}

// ── 2. Title, with the buddy in its band above the Claude Code prompt ─────────

export const Title: React.FC = () => {
  const frame = useCurrentFrame()
  const letters = 'BUDDIES'.split('')
  const petted = usePop(96, 10)
  return (
    <AbsoluteFill>
      <div style={{ position: 'absolute', top: 190, width: '100%', display: 'flex', justifyContent: 'center', gap: 6 }}>
        {letters.map((ch, i) => {
          const p = usePop(i * 5, 10)
          return (
            <span key={i} style={{ fontFamily: FONT.pixel, fontSize: 150, color: i % 2 ? C.ink : C.accent, transform: `translateY(${(1 - p) * -260}px)`, opacity: p, display: 'inline-block' }}>
              {ch}
            </span>
          )
        })}
      </div>
      <Caption top={390} delay={30} size={44}>
        A pixel buddy that lives right
        <br />
        above your Claude Code prompt
      </Caption>
      {/* The recording: pressing pet at 4.2 s turns Sprout's eyes to hearts (frame 96 here). The cut skips
          a redraw glitch at about 4.20–4.45 s where the sprite briefly disappears. */}
      <Footage clips={[{ from: 2.6, length: 47 }, { from: 4.5, length: 98 }]} crop={{ x: 396, y: 1300, w: 860, h: 300 }} width={1000} top={570} delay={48} />
      <div style={{ position: 'absolute', top: 970, width: '100%', textAlign: 'center', opacity: petted, transform: `scale(${0.7 + petted * 0.3})` }}>
        <Chip>Press pet ♥</Chip>
      </div>
      <div style={{ position: 'absolute', left: (W - 260) / 2, top: 1070, opacity: petted }}>
        <Sprite species="monkey" mood={frame > 96 ? 'love' : 'idle'} size={260} />
      </div>
    </AbsoluteFill>
  )
}

// ── 2b. Chatting, from the real recording ─────────────────────────────────────

export const Chat: React.FC = () => {
  const frame = useCurrentFrame()
  const sent = usePop(62, 14)
  const reply = usePop(108, 13)
  return (
    <AbsoluteFill>
      <Headline top={150} size={80}>
        Chat with it
      </Headline>
      {/* The recording: typing the command, then the reply. The cut skips a redraw glitch at 23.0–23.3 s. */}
      <Footage clips={[{ from: 20.0, length: 88 }, { from: 23.35, length: 140 }]} crop={{ x: 396, y: 1300, w: 1180, h: 300 }} width={1000} top={300} delay={14} />
      <div style={{ position: 'absolute', top: 600, right: 70, opacity: sent, transform: `translateY(${(1 - sent) * 30}px)` }}>
        <Chip color={C.ink} style={{ fontFamily: FONT.mono, fontWeight: 600, fontSize: 30 }}>/buddy chat hey sprout!</Chip>
      </div>
      <div
        style={{
          position: 'absolute', top: 730, left: 70, right: 70, background: C.panel, borderRadius: 30, padding: '34px 40px',
          boxShadow: `0 12px 0 ${C.line}`, fontFamily: FONT.body, fontSize: 40, lineHeight: 1.35, color: C.ink, fontStyle: 'italic',
          opacity: reply, transform: `translateY(${(1 - reply) * 40}px)`,
        }}
      >
        <span style={{ color: C.muted }}>waves a banana from my perch above the prompt</span> Oh, hi there! I’m Sprout, lvl 6. What are we coding today?
      </div>
      <div style={{ position: 'absolute', left: 90, top: 1050, opacity: reply }}>
        <Sprite species="monkey" mood={frame > 108 ? 'happy' : 'busy'} wearing="nightcap" size={260} />
      </div>
    </AbsoluteFill>
  )
}

// ── 3. Moods: it reacts to what's happening ───────────────────────────────────

const BEATS: { mood: Face; when: string; says: string }[] = [
  { mood: 'happy', when: 'Tests pass', says: 'All green!' },
  { mood: 'sad', when: 'A tool fails', says: 'Ouch, Bash failed.' },
  { mood: 'busy', when: 'Claude is editing', says: '*Peeling a banana with great focus…*' },
  { mood: 'sleepy', when: 'After 10pm', says: 'zZz' },
  { mood: 'love', when: 'You pet it', says: '*leans into it*' },
]

export const Moods: React.FC = () => {
  const frame = useCurrentFrame()
  const beatLength = 47
  const i = Math.min(BEATS.length - 1, Math.max(0, Math.floor((frame - 14) / beatLength)))
  const beat = BEATS[i] as (typeof BEATS)[number]
  const local = frame - 14 - i * beatLength
  const pop = spring({ frame: local, fps: 30, config: { damping: 14, mass: 1 } })
  return (
    <AbsoluteFill>
      <Headline top={150} size={70}>
        It reacts to
        <br />
        your session
      </Headline>
      <div style={{ position: 'absolute', top: 420, width: '100%', textAlign: 'center', transform: `scale(${0.85 + pop * 0.15})`, opacity: frame < 14 ? 0 : 1 }}>
        <Chip>{beat.when}</Chip>
      </div>
      <div
        style={{
          position: 'absolute', top: 540, left: 120, right: 120, textAlign: 'center', fontFamily: FONT.body, fontStyle: 'italic', fontWeight: 600,
          fontSize: 40, color: C.ink, opacity: frame < 14 ? 0 : pop,
        }}
      >
        “{beat.says.replace(/^\*|\*$/g, '')}”
      </div>
      <div style={{ position: 'absolute', left: (W - 560) / 2, top: 660 }}>
        <Sprite species="monkey" mood={frame < 14 ? 'idle' : beat.mood} size={560} />
      </div>
    </AbsoluteFill>
  )
}

// ── 4. It grows up ────────────────────────────────────────────────────────────

export const GrowUp: React.FC = () => {
  const frame = useCurrentFrame()
  const stages = [
    { stage: 'baby' as const, label: 'lvl 1', delay: 10 },
    { stage: 'grown' as const, label: 'lvl 5', delay: 42 },
    { stage: 'radiant' as const, label: 'lvl 10', delay: 74 },
  ]
  return (
    <AbsoluteFill>
      <Headline top={170} size={70}>
        It grows up
        <br />
        as you code
      </Headline>
      <Caption top={370} delay={14}>Every finished turn is 1 xp</Caption>
      <div style={{ position: 'absolute', top: 560, left: 40, right: 40, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        {stages.map(({ stage, label, delay }, i) => {
          const p = usePop(delay, 10)
          const isTop = i === 2
          return (
            <div key={stage} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, opacity: p, transform: `translateY(${(1 - p) * 60}px) scale(${0.6 + p * 0.4})` }}>
              <Sprite
                species="fox" stage={stage} mood={isTop && frame > 96 ? 'love' : 'idle'} wearing={isTop ? 'crown' : null}
                rarity={isTop ? 'rare' : 'common'} sparkle={isTop ? 'gold' : 'none'} size={isTop ? 380 : 300} phase={i * 20}
              />
              <span style={{ fontFamily: FONT.pixel, fontSize: 40, color: isTop ? C.gold : C.muted }}>{label}</span>
            </div>
          )
        })}
      </div>
    </AbsoluteFill>
  )
}

// ── 5. The cast ───────────────────────────────────────────────────────────────

export const Cast: React.FC = () => {
  const size = 150
  const cols = 6
  return (
    <AbsoluteFill>
      <Headline top={150} size={70}>
        18 buddies
        <br />
        to hatch
      </Headline>
      <div style={{ position: 'absolute', top: 420, left: (W - cols * 168) / 2, width: cols * 168, display: 'flex', flexWrap: 'wrap', rowGap: 34 }}>
        {SPECIES_NAMES.map((species, i) => {
          const p = usePop(8 + i * 4.5, 10)
          const legendary = isLegendarySpecies(species)
          return (
            <div key={species} style={{ width: 168, display: 'flex', justifyContent: 'center', opacity: p, transform: `translateY(${(1 - p) * -120}px)` }}>
              <Sprite species={species} rarity={legendary ? 'legendary' : 'common'} sparkle={legendary ? 'gold' : 'none'} mood={legendary ? 'happy' : 'idle'} size={size} phase={i * 13} />
            </div>
          )
        })}
      </div>
      <Caption top={960} delay={100} size={38}>
        Dragons and skulls only hatch
        <br />
        as legendaries <span style={{ color: C.gold }}>✦</span>
      </Caption>
    </AbsoluteFill>
  )
}

// ── 6. Wardrobe ───────────────────────────────────────────────────────────────

export const Wardrobe: React.FC = () => {
  const frame = useCurrentFrame()
  const step = 15
  const index = Math.min(ITEMS.length - 1, Math.max(0, Math.floor((frame - 8) / step)))
  const item = ITEMS[index] as (typeof ITEMS)[number]
  const local = (frame - 8) % step
  const squash = frame >= 8 && local < 3 ? 1.04 : 1
  return (
    <AbsoluteFill>
      <Headline top={150} size={70}>
        Unlock things
        <br />
        to wear
      </Headline>
      <div style={{ position: 'absolute', top: 420, width: '100%', textAlign: 'center' }}>
        <Chip color={C.ink}>
          {item.emoji} {item.name}
        </Chip>
      </div>
      <div style={{ position: 'absolute', left: (W - 560) / 2, top: 600, transform: `scale(${squash})`, transformOrigin: '50% 100%' }}>
        <Sprite species="cat" mood="happy" wearing={frame < 8 ? null : (item.id as ItemId)} size={560} />
      </div>
    </AbsoluteFill>
  )
}

// ── 7. Leaderboard podium ─────────────────────────────────────────────────────

const PODIUM: { place: 1 | 2 | 3; name: string; species: SpeciesName; height: number; color: string; xp: number }[] = [
  { place: 2, name: 'Jordan', species: 'capybara', height: 250, color: C.silver, xp: 95 },
  { place: 1, name: 'Alex', species: 'dragon', height: 360, color: C.gold, xp: 170 },
  { place: 3, name: 'Sam', species: 'duck', height: 170, color: C.bronze, xp: 43 },
]

export const Podium: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const colW = 300
  const baseY = 1180
  return (
    <AbsoluteFill>
      <Headline top={140} size={66}>
        Rank up with
        <br />
        your friends
      </Headline>
      <div style={{ position: 'absolute', top: 340, width: '100%', textAlign: 'center' }}>
        <Chip color={C.ink} style={{ fontFamily: FONT.mono, fontWeight: 600, fontSize: 30, opacity: usePop(14, 16) }}>/buddy:new-leaderboard</Chip>
      </div>
      {PODIUM.map(({ place, name, species, height, color, xp }, i) => {
        const rise = spring({ frame: frame - 20 - (3 - place) * 9, fps, config: { damping: 16, mass: 1 } })
        const drop = spring({ frame: frame - 56 - (3 - place) * 14, fps, config: { damping: 10, mass: 0.9 } })
        const left = (W - 3 * colW - 2 * 20) / 2 + i * (colW + 20)
        const h = height * rise
        const spriteSize = place === 1 ? 270 : 220
        return (
          <React.Fragment key={place}>
            <div
              style={{
                position: 'absolute', left, top: baseY - h, width: colW, height: h, background: '#fffaf2', border: `5px solid ${color}`,
                borderBottomWidth: 14, borderRadius: '22px 22px 8px 8px', display: 'flex', justifyContent: 'center', paddingTop: 18, overflow: 'hidden',
              }}
            >
              <span style={{ fontFamily: FONT.pixel, fontSize: place === 1 ? 92 : 72, color }}>{place}</span>
            </div>
            <div
              style={{
                position: 'absolute', left: left + (colW - spriteSize) / 2, top: baseY - height - spriteSize * 0.86 - 104 - (place === 1 ? 52 : 0) - (1 - drop) * 700,
                display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: drop > 0.02 ? 1 : 0,
              }}
            >
              {place === 1 && <div style={{ fontSize: 54, marginBottom: -6, opacity: frame > 102 ? 1 : 0 }}>👑</div>}
              <Sprite
                species={species} size={spriteSize} mood={frame > 102 ? 'happy' : 'idle'} phase={i * 9}
                rarity={place === 1 ? 'legendary' : 'common'} sparkle={place === 1 ? 'gold' : 'none'}
              />
              <div style={{ fontFamily: FONT.body, fontWeight: 700, fontSize: 32, color: C.ink, marginTop: 8 }}>{name}</div>
              <div style={{ fontFamily: FONT.mono, fontWeight: 600, fontSize: 24, color: C.muted }}>{xp} xp</div>
            </div>
          </React.Fragment>
        )
      })}
    </AbsoluteFill>
  )
}

// ── 8. Outro ──────────────────────────────────────────────────────────────────

export const Outro: React.FC = () => {
  const crew: SpeciesName[] = ['dog', 'duck', 'monkey', 'capybara', 'octopus']
  return (
    <AbsoluteFill>
      <Headline top={250} size={140} color={C.accent}>
        BUDDIES
      </Headline>
      <Caption top={430} delay={12} size={44}>
        for Claude Code
      </Caption>
      <div style={{ position: 'absolute', top: 580, left: 70, right: 70, opacity: usePop(24, 16) }}>
        <div style={{ background: '#1d1b26', color: '#e8e4f2', borderRadius: 22, padding: '30px 34px', fontFamily: FONT.mono, fontSize: 31, lineHeight: 1.6, boxShadow: '0 14px 0 #cfc3b0' }}>
          <span style={{ color: '#ffa25c' }}>/plugin</span> marketplace add
          <br />
          &nbsp;&nbsp;briannaworkman/buddies
        </div>
      </div>
      <Caption top={840} delay={36} size={36}>
        github.com/briannaworkman/buddies
      </Caption>
      <div style={{ position: 'absolute', top: 980, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 4 }}>
        {crew.map((species, i) => {
          const p = usePop(34 + i * 6, 10)
          return (
            <div key={species} style={{ opacity: p, transform: `translateY(${(1 - p) * 140}px)` }}>
              <Sprite species={species} mood="happy" size={190} phase={i * 7} />
            </div>
          )
        })}
      </div>
      {/* Bensound's free license asks for this credit; it's in the post text too. */}
      <div style={{ position: 'absolute', top: 1250, left: 0, right: 0, textAlign: 'center', fontFamily: FONT.body, fontSize: 24, color: C.muted, opacity: usePop(64, 16) * 0.85 }}>
        Music: Cozy Coffeehouse by Lunar Years · bensound.com
      </div>
    </AbsoluteFill>
  )
}
