import { loadFont as loadFigtree } from '@remotion/google-fonts/Figtree'
import { loadFont as loadJetBrains } from '@remotion/google-fonts/JetBrainsMono'
import { loadFont as loadSilkscreen } from '@remotion/google-fonts/Silkscreen'

// The same cozy palette as the leaderboard page and the README pictures.
export const C = {
  bg: '#f3eee6',
  bgDeep: '#e9e1d4',
  panel: '#ffffff',
  ink: '#262233',
  muted: '#6b6478',
  line: '#ddd3c4',
  accent: '#e8661f',
  gold: '#c7950f',
  silver: '#8a93a6',
  bronze: '#b06a3b',
  dot: '#e2d8c8',
}

export const FONT = {
  pixel: loadSilkscreen().fontFamily,
  body: loadFigtree('normal', { weights: ['400', '600', '700'] }).fontFamily,
  mono: loadJetBrains('normal', { weights: ['400', '600'] }).fontFamily,
}

export const FPS = 30
export const W = 1080
export const H = 1350
