# Before My Time (or maybe not)

A pop culture timeline party game. Guess where things land in time. Snacks, toys, songs, movies, TV, tech, stores, and fads. Built for the generation that raised itself, with room for every generation as packs.

## The core insight

Everyone remembers *when things were around*, not when they debuted. The gap between the two is where the fun lives. The Oreo hit shelves in 1912. Nobody at the table believes that, and that disbelief is the game.

## How it plays

**The core verb** (borrowed from the best of Hitster and Chronology): each new card gets placed into your own growing timeline. Is Bagel Bites before or after the Walkman? The more cards you hold, the tighter the gaps, so difficulty ramps naturally with zero rules overhead.

### Solo: Streak Mode
- Start with one anchor card, year revealed.
- Each new card: tap the slot in your timeline where it belongs.
- Correct: card locks in, year and fun fact revealed, streak grows.
- Wrong: lose one of 3 lives, the card shows you where it really goes.
- Every 5 correct placements: a **Call the Year** bonus round. Land within 2 years and earn a Skip token.
- **Sleeper cards** (way older than you think) get a special reveal. They are seeded deliberately, roughly one per 8 to 10 cards.
- Final score: cards placed. Share your streak.

### Party: Pass the Phone
- 2 to 6 players or teams, one device, the phone is the referee.
- On your turn, place the card into *your* timeline.
- Miss, and the card passes left: the next player can steal it by placing it correctly in *their* timeline. One attempt each until someone claims it or it dies.
- Each player starts with 2 Skip tokens to dodge brutal cards. (Earning tokens via Call the Year in party mode is on the roadmap; v1 keeps the party loop fast.)
- First to 10 cards wins.

## The two-date data model

Every card carries:

| Field | Meaning |
|---|---|
| `year` | Debut year. The verifiable scoring truth. |
| `era` | Peak-popularity era tag. Controls which pack the card appears in. |
| `sleeper` | True when debut is far earlier than peak. Powers the gasp reveal. |
| `fact` | The one-line payoff shown after the guess. |

A card can live in the Gen X pack because it was on your shelf in 1985 even though the answer is 1912. That is a feature, not a bug.

## Content principles

1. Never fabricate a year. Every card's debut year must be verifiable.
2. Uncertain items go to `data/verification-backlog.md`, not into the deck.
3. Players can flag a bad card in-app (Wikitrivia's best idea). The deck self-heals.
4. Sleepers are gold. Hunt for them on purpose.

## v1 scope

- One pack: **Gen X** (~230 cards across 8 categories), tuned for people who came of age roughly 1975 to 1995.
- Single-file mobile-first web app, installable as a PWA, deployable to GitHub Pages as-is.
- Per-device seen-card tracking so repeats are rare across sessions.

## Roadmap

- Verification pass to grow the deck toward 500+, then 1,000.
- Millennial and Boomer packs (the data model already supports them via `era`).
- Card flagging backend (v1 flags store locally and export).
- Real multiplayer only if pass-the-phone proves the demand.

## Dev

No build tooling required. Open `index.html`. `scripts/build.mjs` inlines the card data into `dist/before-my-time.html` for single-file sharing. `scripts/validate.mjs` checks the deck for duplicates, year sanity, and category balance.
