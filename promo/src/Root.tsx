import React from 'react'
import { Composition } from 'remotion'

import { Promo, TOTAL } from './Promo'
import { FPS, H, W } from './theme'

export const Root: React.FC = () => (
  <Composition id="Promo" component={Promo} durationInFrames={TOTAL} fps={FPS} width={W} height={H} />
)
