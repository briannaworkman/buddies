import React from 'react'
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'

import { C, FONT, H, W } from './theme'

// A soft dotted grid, like pixel paper, that drifts slowly.
export const Backdrop: React.FC = () => {
  const frame = useCurrentFrame()
  const drift = (frame * 0.3) % 36
  return (
    <AbsoluteFill
      style={{
        background: C.bg,
        backgroundImage: `radial-gradient(${C.dot} 3px, transparent 3.5px)`,
        backgroundSize: '36px 36px',
        backgroundPosition: `${drift}px ${drift}px`,
      }}
    />
  )
}

// Springs in from below; `delay` is in frames.
export const usePop = (delay = 0, damping = 12) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  return spring({ frame: frame - delay, fps, config: { damping: damping + 3, mass: 1 } })
}

export const Headline: React.FC<{ children: React.ReactNode; delay?: number; size?: number; color?: string; top: number }> = ({ children, delay = 0, size = 76, color = C.ink, top }) => {
  const p = usePop(delay)
  return (
    <div
      style={{
        position: 'absolute', top, left: 60, right: 60, textAlign: 'center',
        fontFamily: FONT.pixel, fontSize: size, lineHeight: 1.1, color, letterSpacing: 2,
        opacity: p, transform: `translateY(${(1 - p) * 40}px)`,
      }}
    >
      {children}
    </div>
  )
}

export const Caption: React.FC<{ children: React.ReactNode; delay?: number; top: number; size?: number }> = ({ children, delay = 0, top, size = 40 }) => {
  const p = usePop(delay, 16)
  return (
    <div
      style={{
        position: 'absolute', top, left: 80, right: 80, textAlign: 'center',
        fontFamily: FONT.body, fontWeight: 600, fontSize: size, lineHeight: 1.3, color: C.muted,
        opacity: p, transform: `translateY(${(1 - p) * 24}px)`,
      }}
    >
      {children}
    </div>
  )
}

// A chunky pixel label, like the tags on the site.
export const Chip: React.FC<{ children: React.ReactNode; color?: string; style?: React.CSSProperties }> = ({ children, color = C.accent, style }) => (
  <div
    style={{
      display: 'inline-block', fontFamily: FONT.body, fontWeight: 700, fontSize: 30, color: '#fff', background: color,
      padding: '8px 22px', borderRadius: 999, boxShadow: `0 6px 0 ${C.line}`, ...style,
    }}
  >
    {children}
  </div>
)

// Squares sweep in diagonally to cover the frame, then sweep out: the cut between scenes hides at the midpoint.
export const PixelWipe: React.FC<{ duration: number }> = ({ duration }) => {
  const frame = useCurrentFrame()
  const size = 90
  const cols = Math.ceil(W / size)
  const rows = Math.ceil(H / size)
  const half = duration / 2
  const squares = []
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const order = (x + y) / (cols + rows - 2)
      const grow = interpolate(frame, [order * half * 0.7, order * half * 0.7 + half * 0.3], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
      const shrink = interpolate(frame, [half + order * half * 0.7, half + order * half * 0.7 + half * 0.3], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
      const s = grow * (1 - shrink)
      if (s <= 0) continue
      squares.push(
        <div key={`${x}-${y}`} style={{ position: 'absolute', left: x * size + (size * (1 - s)) / 2, top: y * size + (size * (1 - s)) / 2, width: size * s + 1, height: size * s + 1, background: C.accent }} />,
      )
    }
  }
  return <AbsoluteFill>{squares}</AbsoluteFill>
}
