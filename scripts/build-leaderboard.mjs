// Builds leaderboard/leaderboard.html: bundles leaderboard/page.ts (with the plugin's sprite and card code)
// and inlines it into leaderboard/template.html, so the page is one self-contained file.
// Run after changing the leaderboard page or the art: node scripts/build-leaderboard.mjs

import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const bundle = execFileSync(
  'npx',
  ['-y', 'esbuild@0.24.2', 'leaderboard/page.ts', '--bundle', '--format=iife', '--minify', '--target=es2020', '--charset=utf8'],
  { cwd: root, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 },
)
const template = readFileSync(`${root}leaderboard/template.html`, 'utf8')
if (!template.includes('/*LEADERBOARD_BUNDLE*/')) throw new Error('leaderboard/template.html is missing the /*LEADERBOARD_BUNDLE*/ marker')
// A literal "</script" inside the bundle would end the inline script early.
const html = template.replace('/*LEADERBOARD_BUNDLE*/', () => bundle.trim().replace(/<\/script/gi, '<\\/script'))
writeFileSync(`${root}leaderboard/leaderboard.html`, html)
console.log(`Wrote leaderboard/leaderboard.html (${Math.round(html.length / 1024)} KB)`)
