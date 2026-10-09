import React from 'react'
import { AbsoluteFill } from 'remotion'

import { Backdrop } from './parts'
import { Sprite } from './Sprite'
import { C, FONT } from './theme'

// The card GitHub shows when someone shares the repo link: 1280×640, with everything important
// kept well inside the edges, since some sites crop them.
export const SocialPreview: React.FC = () => (
  <AbsoluteFill>
    <Backdrop />
    <div style={{ position: 'absolute', left: 90, top: 150, display: 'flex', flexDirection: 'column', gap: 26 }}>
      <div style={{ display: 'flex', gap: 6 }}>
        {'BUDDIES'.split('').map((ch, i) => (
          <span key={i} style={{ fontFamily: FONT.pixel, fontSize: 112, color: i % 2 ? C.ink : C.accent }}>
            {ch}
          </span>
        ))}
      </div>
      <div style={{ fontFamily: FONT.body, fontWeight: 700, fontSize: 46, color: C.ink, lineHeight: 1.2 }}>
        A pixel pet that lives above
        <br />
        your Claude Code prompt
      </div>
      <div>
        <span
          style={{
            display: 'inline-block', fontFamily: FONT.body, fontWeight: 700, fontSize: 28, color: '#fff', background: C.accent,
            padding: '8px 24px', borderRadius: 999, boxShadow: `0 5px 0 ${C.line}`,
          }}
        >
          Free &amp; open source
        </span>
      </div>
    </div>
    <div style={{ position: 'absolute', left: 860, top: 110 }}>
      <Sprite species="dragon" mood="happy" rarity="legendary" wearing="crown" sparkle="gold" size={200} phase={17} />
    </div>
    <div style={{ position: 'absolute', left: 820, top: 250 }}>
      <Sprite species="monkey" mood="happy" wearing="nightcap" size={330} phase={17} />
    </div>
    <div style={{ position: 'absolute', left: 730, top: 450 }}>
      <Sprite species="duck" mood="happy" size={150} phase={17} />
    </div>
    <div style={{ position: 'absolute', left: 1080, top: 430 }}>
      <Sprite species="capybara" mood="happy" size={150} phase={17} />
    </div>
  </AbsoluteFill>
)
