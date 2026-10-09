import React from 'react'
import { AbsoluteFill } from 'remotion'

import type { ItemId, Rarity, SpeciesName } from '../../types'

import { Backdrop } from './parts'
import { Sprite } from './Sprite'
import { C, FONT, W } from './theme'

type Placed = { species: SpeciesName; x: number; y: number; size: number; rarity?: Rarity; wearing?: ItemId }

// The crowd around Sprout: two flanking, a row along the bottom. Positions are each sprite's top-left.
const CROWD: Placed[] = [
  { species: 'fox', x: 40, y: 560, size: 250 },
  { species: 'dragon', x: W - 290, y: 540, size: 250, rarity: 'legendary', wearing: 'crown' },
  { species: 'duck', x: 30, y: 960, size: 220 },
  { species: 'capybara', x: 240, y: 1010, size: 220 },
  { species: 'cat', x: 450, y: 1030, size: 200, wearing: 'bow' },
  { species: 'octopus', x: 640, y: 1010, size: 220 },
  { species: 'ghost', x: 840, y: 970, size: 210 },
]

export const Thumbnail: React.FC = () => (
  <AbsoluteFill>
    <Backdrop />
    <div style={{ position: 'absolute', top: 110, width: '100%', display: 'flex', justifyContent: 'center', gap: 8 }}>
      {'BUDDIES'.split('').map((ch, i) => (
        <span key={i} style={{ fontFamily: FONT.pixel, fontSize: 176, color: i % 2 ? C.ink : C.accent }}>
          {ch}
        </span>
      ))}
    </div>
    <div style={{ position: 'absolute', top: 330, width: '100%', textAlign: 'center', fontFamily: FONT.body, fontWeight: 700, fontSize: 56, color: C.ink }}>
      A pixel pet for Claude Code
    </div>
    {CROWD.map(p => (
      <div key={p.species} style={{ position: 'absolute', left: p.x, top: p.y }}>
        <Sprite
          species={p.species} mood="happy" size={p.size} rarity={p.rarity ?? 'common'} wearing={p.wearing ?? null}
          sparkle={p.rarity === 'legendary' ? 'gold' : 'none'} phase={17}
        />
      </div>
    ))}
    <div style={{ position: 'absolute', left: (W - 540) / 2, top: 470 }}>
      <Sprite species="monkey" mood="happy" size={540} wearing="nightcap" phase={17} />
    </div>
    <div style={{ position: 'absolute', top: 1250, width: '100%', textAlign: 'center' }}>
      <span
        style={{
          display: 'inline-block', fontFamily: FONT.body, fontWeight: 700, fontSize: 34, color: '#fff', background: C.accent,
          padding: '10px 28px', borderRadius: 999, boxShadow: `0 6px 0 ${C.line}`,
        }}
      >
        Free &amp; open source
      </span>
    </div>
  </AbsoluteFill>
)
