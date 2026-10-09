import React from 'react'
import { AbsoluteFill, Audio, interpolate, Sequence, staticFile } from 'remotion'

import { Backdrop, PixelWipe } from './parts'
import { Cast, Chat, GrowUp, Hatch, Moods, Outro, Podium, Title, Wardrobe } from './scenes'

// Scene lengths in frames, at 30 fps. Their sum is the video's length.
export const SCENES = [
  { name: 'Hatch', length: 135, Scene: Hatch },
  { name: 'Title', length: 180, Scene: Title },
  { name: 'Chat', length: 205, Scene: Chat },
  { name: 'Moods', length: 260, Scene: Moods },
  { name: 'GrowUp', length: 150, Scene: GrowUp },
  { name: 'Cast', length: 175, Scene: Cast },
  { name: 'Wardrobe', length: 160, Scene: Wardrobe },
  { name: 'Podium', length: 175, Scene: Podium },
  { name: 'Outro', length: 165, Scene: Outro },
]
export const TOTAL = SCENES.reduce((sum, s) => sum + s.length, 0)
const WIPE = 26
// Cozy Coffeehouse by Lunar Years, from bensound.com (the post needs to credit it). Fades in over a third
// of a second and out over the last two seconds.
const MUSIC = 'music/bensound-cozycoffeehouse.mp3'
const musicVolume = (frame: number) =>
  0.8 * interpolate(frame, [0, 10, TOTAL - 60, TOTAL - 1], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

export const Promo: React.FC = () => {
  let start = 0
  const parts = SCENES.map(({ name, length, Scene }, i) => {
    const from = start
    start += length
    return (
      <React.Fragment key={name}>
        <Sequence from={from} durationInFrames={length} name={name}>
          <Scene />
        </Sequence>
        {i > 0 && (
          <Sequence from={from - WIPE / 2} durationInFrames={WIPE} name={`wipe into ${name}`}>
            <PixelWipe duration={WIPE} />
          </Sequence>
        )}
      </React.Fragment>
    )
  })
  return (
    <AbsoluteFill>
      <Backdrop />
      {parts}
      <Audio src={staticFile(MUSIC)} volume={musicVolume} />
    </AbsoluteFill>
  )
}
