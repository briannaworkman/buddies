import React from 'react'
import { useCurrentFrame } from 'remotion'

import type { Face, ItemId, Rarity, SpeciesName, Stage } from '../../types'

import { buddySvg } from '../../hooks/art'

type Props = {
  species: SpeciesName
  mood?: Face
  stage?: Stage
  rarity?: Rarity
  wearing?: ItemId | null
  size: number
  // Frames to offset the bob and blink, so a row of buddies doesn't move in lockstep.
  phase?: number
  sparkle?: 'none' | 'cool' | 'gold'
  style?: React.CSSProperties
}

// The plugin's sprites animate with SVG timers, which a frame-by-frame render can't follow.
// So the timers are stripped and the bob, blink and sparkles are driven by the frame instead.
const still = (svg: string) =>
  svg
    .replace(/<animate(Transform)?\b[^>]*\/>/g, '')
    .replace(/<rect[^>]*opacity="0"[^>]*>\s*<\/rect>/g, '')
    .replace('<svg ', '<svg width="100%" height="100%" ')

const SPARKS: [number, number][] = [[-0.06, 0.2], [0.92, 0.32], [0.02, 0.7], [0.86, 0.06], [0.98, 0.66], [-0.1, 0.45], [0.46, -0.06]]

export const Sprite: React.FC<Props> = ({ species, mood = 'idle', stage = 'grown', rarity = 'common', wearing = null, size, phase = 0, sparkle = 'none', style }) => {
  const frame = useCurrentFrame() + phase
  const glad = mood === 'happy' || mood === 'love'
  const bob = glad ? -Math.abs(Math.sin(frame / 5)) * size * 0.045 : Math.sin(frame / 20) * size * 0.012
  const isBlinking = mood === 'idle' && frame % 130 < 5
  const svg = still(buddySvg({ species, mood: isBlinking ? 'blink' : mood, stage, rarity, wearing }))
  const color = sparkle === 'gold' ? '#ffcf3f' : '#7fdcec'
  const pixel = size / 22
  return (
    <div style={{ position: 'relative', width: size, height: (size * 19) / 22, ...style }}>
      <div style={{ position: 'absolute', inset: 0, transform: `translateY(${bob}px)` }} dangerouslySetInnerHTML={{ __html: svg }} />
      {sparkle !== 'none' &&
        SPARKS.map(([x, y], i) => {
          const t = ((frame + i * 13) % 66) / 66
          const opacity = Math.max(0, Math.sin(t * Math.PI))
          return <div key={i} style={{ position: 'absolute', left: x * size, top: y * size * 0.86, width: pixel * 1.2, height: pixel * 1.2, background: color, opacity }} />
        })}
    </div>
  )
}
