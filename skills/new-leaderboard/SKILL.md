---
name: new-leaderboard
description: Start a new Buddies leaderboard, a shared page where friends post their buddy cards and see everyone ranked. Use when the user runs /buddy:new-leaderboard or asks to create, start or set up a buddy leaderboard.
---

# Start a Buddies leaderboard

A leaderboard is a claude.ai artifact page built from this plugin's `leaderboard/leaderboard.html`. Friends post their buddy cards to it and it ranks everyone's buddies. You publish a fresh copy for the user, name it, connect their buddy to it, and tell them how to invite friends.

## Steps

1. **Pick the name.** Use the name the user gave (in the arguments or their message). If they gave none, ask once in a short question, offering "Buddy Leaderboard" as the default. Keep it to 48 characters.

2. **Copy the page.** The page is `leaderboard/leaderboard.html` two folders above this skill's base directory (`<base directory>/../../leaderboard/leaderboard.html`). Copy it unchanged into your scratchpad directory (or, without one, a new folder under the working directory) as `buddy-leaderboard.html`. Never edit it: the page's script is generated and checks everything people post.

3. **Publish it** with the Artifact tool: `file_path` the copy, `icon` `"trophy"`, `description` `"A Buddies leaderboard: friends post their buddy cards and it ranks everyone's buddies."`, and exactly these capabilities:

   ```json
   { "db": { "rules": [{ "path": "meta", "read": "view", "write": "admin" }] }, "user": {} }
   ```

   Everyone who can post writes their own entry under `members/`; only the owner and editors rename the leaderboard under `meta/`. Don't add other capabilities and don't write any member entries yourself. If the Artifact tool isn't available (for example the user isn't signed in to claude.ai), stop and tell them that a leaderboard needs a claude.ai account.

4. **Name the leaderboard.** Write the name to the page's data with the ArtifactData tool: action `set`, the new artifact's `url`, collection `meta`, doc id `leaderboard`, data `{ "name": "<the name>" }`.

5. **Connect their buddy.** Try saving the link into buddy's settings:

   ```bash
   echo '{"leaderboardUrl":"<the artifact url>"}' | claude plugin configure buddy@buddies --values-stdin
   ```

   If that command fails or isn't available, don't retry: tell the user to run `/buddy leaderboard <the artifact url>` themselves.

6. **Tell them what's next**, briefly:
   - The leaderboard's link.
   - To post their own buddy: run `/buddy share` and paste the card on the page.
   - To invite friends: open the page's **Share** menu and add each friend **by email as an Editor**. Only people invited that way (or members of their own organization) can post; a public link only lets people watch. Editors can also publish page versions, so invite people they trust.
   - What friends do: install Buddies (`/plugin marketplace add briannaworkman/buddies`, then `/plugin install buddy@buddies`), run `/buddy leaderboard <the artifact url>`, then `/buddy share` and paste their card.
