# Buddies

A pixel-art companion that lives above your prompt in Claude Code. It reacts to your session, grows up as you work together, unlocks accessories, watches your PRs, Slack mentions and meetings, and can join a Buddy League leaderboard with your friends.

<p align="center"><img src="docs/cast.svg" alt="All eighteen buddies: dog, cat, fox, red panda, cow, monkey, pufferfish, otter, ghost, robot, skull, dragon, slime, rubber duck, capybara, octopus, bat and mushroom" width="100%"></p>

Your first session after installing hatches a random buddy: one of 16 species (dog, cat, fox, red panda, cow, monkey, pufferfish, otter, ghost, robot, slime, rubber duck, capybara, octopus, bat, mushroom) at a random rarity (common 60%, uncommon 25%, rare 10%). The other 5% of the time you hatch a legendary: a dragon or a skull, which hatch no other way.

## Install

At a Claude Code prompt, add the marketplace and install the plugin, picking the user scope:

```
/plugin marketplace add briannaworkman/buddies
/plugin install buddy@buddies
```

Or clone the repo somewhere you'll keep it (for example `~/code/buddies`) and run `/plugin install buddy --marketplace ~/code/buddies`.

Your buddy hatches right away, or in your next session.

## What it does

- **Reacts to your session**: narrates what Claude is up to with Claude Code's own spinner verbs and its species' habits, winces when a tool fails, and celebrates passing tests and finished turns.
- **Grows up**: baby (in its eggshell) until level 5, grown-up until 10, then radiant with golden sparkles. Every finished turn is 1 xp.
- **Moods**: greets you by time of day, gets sleepy after 10pm, and grumpy if you haven't petted it in a day.
- **Streak**: a 🔥 day streak in the band, shared by all your buddies.
- **Accessories** you unlock and wear: 🎀 bow, 🌙 nightcap, 🎩 top hat, 🧢 cap, 🥽 goggles, 💗 heart badge, 🎧 headphones, 😎 sunglasses, 👑 crown.
- **Watches** your open PRs for approvals and requested changes, your Slack mentions, and meetings starting in the next 10 minutes.
- **Pixel art** in the desktop app; ASCII art in the terminal.

### Moods

Its face follows what's happening in your session.

<img src="docs/moods.svg" alt="The dog in each mood: idle, happy, love, sad, busy, sleepy and grumpy" width="100%">

### Growing up

Buddies start in their eggshell, grow up at level 5 and turn radiant at level 10. Rare buddies sparkle, and legendaries sparkle gold.

<img src="docs/growth.svg" alt="A fox as a baby, grown-up, rare and radiant, and a legendary dragon" width="100%">

### Wardrobe

Nine accessories, each unlocked by something you do together. `/buddy items` shows how to earn the ones you haven't found yet.

<img src="docs/wardrobe.svg" alt="The cat wearing each accessory: bow, nightcap, top hat, cap, goggles, heart badge, headphones, sunglasses and crown" width="100%">

### In the terminal

The terminal draws your buddy in three lines of text, tinted by rarity:

```
 /\_/\     ^__^     n___n     /\_^_/\
<(o.o)>   (o.o)    ( o.o )   >(^.^)<
  \v/~~    (oo)    (__-__)    /vvv\~
  fox      cow    capybara   dragon
```

## Commands

| Command | What it does |
| --- | --- |
| `/buddy` | Your buddy's card: level, xp, streak, items |
| `/buddy pet` | Pet it (so does the **pet** button in the band) |
| `/buddy chat <message>` | Talk to it; it answers in character |
| `/buddy items` | Your wardrobe, with hints for locked items |
| `/buddy wear <item>` or `/buddy wear none` | Change what it's wearing |
| `/buddy adopt <species> [name]` | Hatch another buddy and swap it in (any species but the legendaries) |
| `/buddy switch <name>` | Swap which buddy is in your band |
| `/buddy season <month> <name>` | Make a buddy move in automatically that month (`off` to clear) |
| `/buddy leaderboard` | Rank your own buddies |
| `/buddy share` | Copy your buddy card for your Buddy League |
| `/buddy rename <name>` · `/buddy hide` · `/buddy show` | |

## Settings

Change these in the plugin's settings (`/plugin`, then buddy):

- **GitHub organization** (default: empty): only your PRs in this org count for approval reactions. Leave empty for all of your PRs.
- **Buddy League page** (optional): a leaderboard page that `/buddy share` points you to. Leave empty if you don't use one.
- **Watch Slack mentions** (off by default): alert when you're mentioned in Slack.
- **Watch calendar** (off by default): alert when a meeting starts in the next 10 minutes.

## Optional: Slack and Calendar alerts

Turn on **Watch Slack mentions** or **Watch calendar** in the settings. Buddy then checks every 2 minutes, but only calls the connector when your settings already allow it, so it never pops a permission prompt. Add your Slack search and Calendar list-events tools to `permissions.allow` in `~/.claude/settings.json`, and run `/buddy` to see which ones it's still waiting on. The PR watcher is always on and needs the GitHub CLI (`gh`) signed in.

## Optional: post to a league every day

If you and your friends keep a Buddy League page, `/buddy share` and pasting the card into it works any time. To post automatically, buddy keeps your latest card in `~/.claude/buddy/card.json`; a daily Claude scheduled task can read that file and update your entry on the league page. Post once by hand first so your entry exists.

## Make it yours

Claude Code runs buddy straight from the folder you installed it from, so you can edit its files and run `/reload-plugins` to see the change. The easiest way is to open a Claude Code session in your buddy folder and ask, for example "make my buddy talk like a pirate" or "make my ghost purple".

To edit by hand, these are the places to look:

| Want to change | Look for |
| --- | --- |
| What buddy says (prompt cheers, test celebrations, idle mumbles, grumpy lines) | `LINES` in `hooks/data.ts` |
| Working verbs ("*Pondering…*"), finished-turn cheers, idle chatter, and each species' habits | `WORKING`, `CHEERS`, `IDLE`, `HABITS` in `hooks/vocab.ts` |
| Names a new buddy can hatch with | `NAMES` in `hooks/data.ts` |
| Hatch odds for each rarity | `RARITY` in `hooks/data.ts` |
| Accessories, how to unlock them, and their pixels | `ITEMS` in `hooks/data.ts` |
| The levels where it grows up | `STAGES` in `hooks/data.ts` |
| Night hours (sleepy face and the nightcap) | `NIGHT_FROM`, `NIGHT_UNTIL` in `hooks/data.ts` |
| How long speech lingers, how often it checks GitHub, Slack and Calendar, meeting warning time | `MOOD_MS`, `WATCH_MS`, `MEETING_SOON_MIN` in `hooks/data.ts` |
| How long before it gets grumpy, and greetings | `idleFace`, `greeting` in `hooks/pet.ts` |
| Its chat personality | `chatPersona` in `hooks/text.ts` |
| What counts as a test run | the `isTest` check in `hooks/register.tsx` |

Each species' art is in `hooks/species.ts`: `ascii` is the terminal version, `rows` is a 16×16 grid of letters (one per pixel) for the desktop app, and `palette` maps the letters to colors. To add a species, add its name to `SpeciesName` in `types/index.d.ts`, then add an entry to `SPECIES` in `species.ts` and `HABITS` in `vocab.ts`. Type-checking flags whichever one is missing.

The pictures in this README are drawn from the same sprites. After changing the art, redraw them with `npx tsx scripts/readme-art.ts`.

`hooks/register.tsx` is the only file that talks to Claude Code. The other files are plain functions, covered by the tests in `tests/`. Run them with `claude plugin test ~/code/buddy`.

If a change breaks something, the transcript shows a dim line naming the problem, and `claude plugin validate ~/code/buddy` checks the plugin. Updating to a newer version replaces your edits, so keep a copy (or a git branch) of anything you've changed.

## Where your buddy lives

Everything is stored by Claude Code on your own machine. Nothing leaves it unless you post to a league.

## License

MIT, see [LICENSE](LICENSE).
