import React from 'react'
import { Composition, Still } from 'remotion'

import { Promo, TOTAL } from './Promo'
import { SocialPreview } from './SocialPreview'
import { Thumbnail } from './Thumbnail'
import { FPS, H, W } from './theme'

export const Root: React.FC = () => (
  <>
    <Composition id="Promo" component={Promo} durationInFrames={TOTAL} fps={FPS} width={W} height={H} />
    <Still id="Thumbnail" component={Thumbnail} width={W} height={H} />
    <Still id="SocialPreview" component={SocialPreview} width={1280} height={640} />
  </>
)
