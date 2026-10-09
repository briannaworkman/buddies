export type Rarity = 'common' | 'uncommon' | 'rare' | 'legendary'
export type Face = 'idle' | 'blink' | 'happy' | 'sad' | 'busy' | 'love' | 'sleepy' | 'grumpy'
export type Stage = 'baby' | 'grown' | 'radiant'
export type SpeciesName =
  | 'dog' | 'cat' | 'fox' | 'redpanda' | 'cow' | 'monkey' | 'pufferfish' | 'otter' | 'ghost'
  | 'robot' | 'skull' | 'dragon' | 'slime' | 'duck' | 'capybara' | 'octopus' | 'bat' | 'mushroom'
export type ItemId = 'bow' | 'nightcap' | 'tophat' | 'cap' | 'goggles' | 'heart' | 'headphones' | 'sunglasses' | 'crown'

// One buddy in the roster. Xp and pets are earned while it's the one in your band.
export type Buddy = {
  id: string
  name: string
  species: SpeciesName
  rarity: Rarity
  hatchedAt: number
  xp: number
  pets: number
  lastPetAt: number
  wearing: ItemId | null
}

export type DayCount = { day: string; count: number; best: number }

// Progress shared by all your buddies.
export type Progress = {
  stats: { tests: number; approvals: number; nights: number }
  streak: DayCount
  // Turns finished today, for the headphones.
  focus: DayCount
  items: ItemId[]
}

export type Roster = {
  // Saves with any other version are ignored and a fresh buddy hatches.
  version: 2
  activeId: string
  buddies: Buddy[]
  progress: Progress
  seasons: { month: number; id: string }[]
  // `YYYY-M` of the last month the season schedule picked a buddy.
  seasonApplied?: string
}

export type Mood = { face: Face; line?: string; until: number }

export type Watch = {
  prDecisions: Record<string, string> | null
  slackSince: number
  seen: string[]
  needsPermission: string[]
}

declare module 'claude-code' {
  interface PluginState {
    buddy: { roster: Roster | null; mood: Mood; isBlinking: boolean; isHidden: boolean; watch: Watch }
  }
}
