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

test('/buddy leaderboard saves a leaderboard link and refuses anything else', async ($, on) => {
  const saved: unknown[] = []
  mock.store(on)
  mock.env(on, {})
  mock.clock(on)
  on('session.start', async () => ({ cwd: '/tmp' }))
  on('command.register', async (_, e) => ({ value: { command: e.name } }))
  on('ui.toast', async () => ({ value: undefined }))
  on('process.run', async () => ({ value: { exitCode: 1, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }))
  on('config.set', async (_, e) => (saved.push([e.key, e.value]), { value: e.value }))
  let copied = ''
  on('ui.copy', async (_, e) => ((copied = e.text), { value: { isCopied: true } }))

  await $.session.start({ cwd: '/tmp', surface: 'terminal', isInteractive: true })
  expect((await $.command.run(run('leaderboard'))).text).toContain("not on a leaderboard yet")
  expect((await $.command.run(run('leaderboard https://example.com/x'))).text).toContain("doesn't look like a leaderboard link")
  expect(saved).toEqual([])

  const joined = await $.command.run(run('leaderboard https://claude.ai/artifact/AbC123?ref=x'))
  expect(joined.text).toContain('Joined the leaderboard at https://claude.ai/artifact/AbC123')
  expect(saved).toEqual([['buddy.leaderboardUrl', 'https://claude.ai/artifact/AbC123']])

  const shared = await $.command.run(run('share'))
  expect(shared.text).toContain('Paste it into your leaderboard: https://claude.ai/artifact/AbC123')
  expect(copied).toContain('buddy-card {"v":2,"id":"c-')
})
