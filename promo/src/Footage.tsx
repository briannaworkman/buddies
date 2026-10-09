import React from 'react'
import { OffthreadVideo, Sequence, staticFile } from 'remotion'

import { usePop } from './parts'

// The screen recording is 2352×1672; the buddy band sits at about x 416–1952, y 1326–1520.
const SRC = { w: 2352, h: 1672 }
type Crop = { x: number; y: number; w: number; h: number }

type Clip = { from: number; length: number }

// A close-up of the recording, framed like a window. Clips play back to back; `from` is in seconds of
// the recording, `length` in frames of the video, so a cut can skip a glitch in the recording.
export const Footage: React.FC<{ clips: Clip[]; crop: Crop; width: number; top: number; delay?: number }> = ({ clips, crop, width, top, delay = 0 }) => {
  const s = width / crop.w
  const p = usePop(delay, 14)
  let at = 0
  return (
    <div
      style={{
        position: 'absolute', top, left: (1080 - width) / 2, width, height: crop.h * s, overflow: 'hidden', borderRadius: 26,
        background: '#f9f9f9', boxShadow: '0 16px 0 #cfc3b0, 0 0 0 6px #fff', opacity: p, transform: `translateY(${(1 - p) * 60}px)`,
      }}
    >
      {clips.map((clip, i) => {
        const start = delay + at
        at += clip.length
        return (
          <Sequence key={i} from={start} durationInFrames={clip.length} layout="none">
            <OffthreadVideo
              src={staticFile('footage/recording.mov')}
              startFrom={Math.round(clip.from * 30)}
              muted
              style={{ position: 'absolute', width: SRC.w * s, height: SRC.h * s, left: -crop.x * s, top: -crop.y * s }}
            />
          </Sequence>
        )
      })}
    </div>
  )
}
