import { expect, mock, test } from 'claude-code/testing'

// How the engine stamps a /buddy run typed at the terminal.
const run = (args: string) => ({ command: 'buddy', args, origin: { kind: 'composer' as const }, presentation: { isFullscreen: false, columns: 100 } })

test('a first session hatches a buddy you can pet', async ($, on) => {
  const toasts: string[] = []
  mock.store(on)
  mock.env(on, {})
  mock.clock(on)
  on('session.start', async () => ({ cwd: '/tmp' }))
  on('command.register', async (_, e) => ({ value: { command: e.name } }))
  on('ui.toast', async (_, e) => (toasts.push(e.text), { value: undefined }))
  on('process.run', async () => ({ value: { exitCode: 1, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }))

  await $.session.start({ cwd: '/tmp', surface: 'terminal', isInteractive: true })
  expect(toasts[0]).toContain('Your buddy hatched')

  const petted = await $.command.run(run('pet'))
  expect(petted.text).toMatch(/^You pet /)
  // The first pet unlocks the bow.
  expect(toasts.some(t => t.includes('unlocked a bow'))).toBe(true)

  const card = await $.command.run(run(''))
  expect(card.text).toContain('petted 1 times')
  expect(card.text).toContain('items: 1/9')
})
