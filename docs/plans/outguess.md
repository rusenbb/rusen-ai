# Outguess

A predictor-vs-human game. The player taps one of a small set of keys. A handful of tiny client-side predictors race to call each next press before it happens.

## Goal

Build a portable, instantly-loading, no-WebGPU, no-server demo that demonstrates one thing well: people are bad at being random, and a few KB of statistics catch them at it.

Hard constraints:
- No WebGPU. No model file downloads. No external API.
- All predictors run on the main thread in plain TS.
- Page must be usable on a phone (touch targets, no keyboard requirement).

## Why this works as a demo

The "Aaronson Oracle" pattern - an order-5 Markov chain that calls F vs J presses ~70% of the time - is one of the most legible "AI beats you" demos that exists. It is small, fast, explainable, and delivers a punchline within 30 seconds of arriving on the page.

Adding a hide-the-AI-guess toggle lets the player run a fair test of their own randomness: the model still scores in the background, the lifetime tally still moves, but the buttons no longer hint where the model expects them to press.

## Relationship to other entries

- **RuseN-Gram** stays a separate `coming-soon`. RuseN-Gram is a language modeling playground (text generation, perplexity, sampling). Outguess uses n-grams as predictors inside a game. Different gimmick, different audience.
- **RL-Arena** is the closest sibling in spirit (model-vs-human). Outguess differs by being a single short loop instead of a tactical game, and by exposing the model's internal state directly.

## Mode

One mode, ships day one:

- 2 keys (`F` / `J` on desktop, big left/right buttons on mobile) by default
- Optional 4-key alphabet (`W` / `A` / `S` / `D`)
- Each tap is one trial. Predictors guess the next tap *before* it happens. Reveal is immediate.
- Session length: ~200 trials with an end-of-session results banner. Player can keep going by hitting Reset.

Continuous (drag-a-signal) mode was scoped at design but cut before ship: a tap-the-keys game has a sharper hook than a draw-a-curve game, and limiting the demo to one input modality keeps the page tighter.

## Predictors

| Predictor | What it does | Notes |
|---|---|---|
| `random` | Uniform guess | Sanity baseline |
| `frequency` | Picks most-common key so far | Catches static bias |
| `markov-1` | Order-1 Markov chain | Catches simple alternation |
| `markov-5` | Order-5 Markov chain | The Aaronson reference predictor |
| `ppm-8` | Prediction by Partial Matching, max order 8 with escape blending | Strongest classical text predictor; what `bzip2`-class compressors are built on |

All trained online. State for `markov-5` over 2 symbols is at most 2⁶ = 64 counts; for 4 symbols, 4⁶ ≈ 4k. Trivial.

## Scoring

- **Accuracy** per predictor over a rolling window of the last 50 trials (leaderboard).
- **Bits saved per trial** (= log₂(P(actual)) under the predictor's distribution) - the right metric, since calibration matters more than raw hits when the player tries mixed strategies.
- **Lifetime tally** for the predictor currently shown in the arena: `right / total (%)`. Recomputed retrospectively over all trials. Jumps when the leader changes mid-session - rare after warmup, and the predictor name is shown alongside the tally so the swap is explicit.

## The hide-the-guess toggle

A small `AI guess: show / hide` pill in the toolbar. When `hide`, the arena no longer rings the predicted button or shows the "AI guess" badge - but the leaderboard, entropy plot, Why? panel, and lifetime tally keep updating. This is the "fair test" mode.

## The "Why?" panel

For the leading predictor, render the matching context and the observed conditional distribution.

Example: after `F-J-F-J` you press `F` 8 of the last 10 times.

This is the part that converts the game from a stunt into a lesson.

## UI Modules

Top to bottom on a single scrollable page:

- **Header** - title, eyebrow, one-line description
- **Alphabet picker** - 2 keys / 4 keys (remounts the session on change)
- **Toolbar** - Reset · AI guess show/hide · AI tally · trials counter
- **Arena** - the input surface (large key targets, with optional ring on the AI's predicted button)
- **Leaderboard** - accuracy / bits-saved per predictor, current and rolling
- **Entropy plot** - conditional bigram entropy over the session
- **Why?** panel - context-matching distribution for the leading model
- **Footnote** - the punchline

Settings stay collapsed by default (in fact, MVP has none beyond the alphabet picker). The page should be playable in ten seconds with zero reading.

## Code layout

```
src/app/outguess/
├── page.tsx                 # OutguessPage + Session (keyed on alphabet)
├── layout.tsx               # SEO metadata via buildProjectMetadata
├── modes.ts                 # shared types
├── predictors/
│   └── discrete.ts          # random / frequency / markov / PPM
├── scoring.ts               # accuracy, bits-saved
├── entropy.ts               # Shannon, conditional bigram
├── why.ts                   # context-matching distribution
└── components/
    ├── arena-discrete.tsx
    ├── leaderboard.tsx
    ├── entropy-plot.tsx
    └── why-panel.tsx
```

## Stretch Goals

- **Aaronson classic mode** - F/J only, 100 trials, global anonymous leaderboard via Cloudflare KV (the only optional backend touch; can be skipped)
- **Replay / share** - encode a session as a URL fragment so a friend can see the same game
- **Suffix tree visualizer** for the n-gram predictor - watch the trie grow as the player plays
- **"Adversarial pair" mode** - two humans take turns, both try to make the other's input unpredictable to the AI
- **Auto-coach** - after the session, suggest one concrete thing the player did predictably ("you avoided three F's in a row")

## Risks

- **Boredom after 50 trials.** Mitigate with short default sessions, immediate visual reward per trial, and an end-of-session screen worth seeing.
- **Markov needs warmup; the leaderboard looks unfair early.** Mitigate by showing per-model "warmup" badge alongside the score until 20 trials are seen.
- **Mobile drag conflicts with page scroll.** N/A in tap-only mode (no drag).
- **Predictors look too good and feel scripted.** Mitigate by showing the Why? panel - when the player can see the matching context, "scripted" becomes "obvious."

## Naming

Working title: **Outguess**.

Alternatives considered:
- `Oracle` - too generic, also taken (Aaronson, the database)
- `Try To Be Random` - funny, hard to link
- `Predictor` - bland

`Outguess` names the interaction in one verb. Player tries to outguess the model; model tries to outguess the player.

## Out of scope

- Any model larger than a few KB of state.
- Any GPU usage.
- Any model file download.
- Audio.
- Continuous-signal forecasting (cut before ship).
- Multi-player networking beyond an optional anonymous leaderboard.
- "Real" RNN / tiny-LSTM training.
