# Adaptive Arena

A 2D tactical duel where the player fights a bot that learns and adapts online.

## Goal

Build a human-vs-bot arena game that is large enough to feel strategic, but structured enough that live adaptation is visible.

Core requirement:
- The arena should be at least `30x30`
- The opponent should adapt to player habits over repeated rounds
- The game should feel more like a tactical skirmish than a toy grid demo

## Core Concept

The player fights a bot in a `30x30` arena with obstacles, pickups, line-of-sight, and short-term resource management.

The bot learns from:
- repeated movement patterns
- favorite routes
- preferred engagement distance
- overused offensive/defensive actions
- pickup greed vs survival behavior

The user should be able to feel:
- early exploration by the bot
- later exploitation of predictable behavior
- shifts in the bot's policy over time

## Why 30x30 Works

`30x30` is large enough to avoid the "this is basically tic-tac-toe" problem, but still small enough for:
- browser rendering
- fast simulation
- coarse state abstraction
- interpretable heatmaps and pathing overlays

The real state used by the learner should not be all 900 cells directly. It should be a compact feature representation derived from the map.

## Game Loop

1. Spawn player and bot into the arena
2. Both move in discrete ticks
3. Each tick allows one action
4. Players collect resources, reposition, or attack
5. Round ends on elimination or timer
6. Bot updates policy between rounds and optionally with step rewards during play

## Arena Design

Arena:
- size: `30x30`
- tile types: floor, wall, cover, hazard, pickup spawn
- partial symmetry so no side has a permanent advantage

Recommended map elements:
- 3 to 5 obstacle clusters
- 2 high-value pickup lanes
- 1 risky center zone
- a few narrow chokepoints plus open flanking space

This makes route preference and adaptation visible.

## Player / Bot Actions

Recommended action space:
- move `up`
- move `down`
- move `left`
- move `right`
- `strafe/hold`
- `basic attack`
- `guard`
- `dash`

Optional later additions:
- place trap
- ranged attack
- fake retreat / feint

Keep the initial action space tight. The depth should come from positioning, line-of-sight, cover, cooldowns, and pickups, not from 20 buttons.

## State Representation

Do not feed the bot the raw 30x30 board as the first version.

Use engineered state features such as:
- relative player position `(dx, dy)` bucketed
- relative distance bucket
- line-of-sight yes/no
- nearest cover direction
- nearest pickup direction
- whether bot is low health
- whether player is low health
- cooldown status
- previous 3 player actions
- previous 3 bot actions
- zone control state (center, flank, pickup lane)
- local obstacle density

This gives a manageable state for online learning while still reflecting a 30x30 tactical map.

## Learning Approach

Recommended v1:
- opponent model + tabular or approximate Q-learning

Split the problem into two parts:
1. Opponent modeling
- predict player's likely next move class
- maintain tendencies over recent rounds

2. Policy learning
- choose bot action based on compact state + opponent estimate

Why this is better than pure RL first:
- faster visible adaptation
- easier to debug
- more satisfying against a human player

Recommended algorithm path:
- v1: Q-learning with discretized features
- v2: linear function approximation or tiny DQN-style approximator
- v3: policy-gradient or self-play experiments

## Reward Design

Round reward:
- `+1.0` win
- `-1.0` loss

Step rewards:
- `+0.15` successful hit
- `-0.18` taking damage
- `+0.08` pickup secured
- `-0.03` wasting dash / attack into empty space
- `-0.01` passive stalling without positional gain

Do not over-shape rewards. Too much shaping causes weird non-fun behavior.

## Exploration vs Exploitation

Must be explicit in the UI.

Show:
- current exploration rate
- predicted player tendency
- action distribution over recent rounds
- bot confidence / uncertainty
- heatmap of where the bot expects the player to go

Recommended exploration schedule:
- higher epsilon in early rounds
- decay over time
- raise epsilon slightly if performance collapses or player strategy shifts sharply

## UI Modules

Main panels:
- Arena view
- Bot adaptation panel
- Player habit panel
- Round timeline
- Policy / reward chart

Useful visualizations:
- player movement heatmap
- bot movement heatmap
- confrontation zones
- action frequency bars
- win-rate trend
- exploration vs exploitation timeline

## MVP Scope

MVP target:
- 30x30 arena
- one map
- one bot
- movement + attack + guard + dash
- pickups for health or energy
- online Q-learning with engineered state
- visible exploration/exploitation chart
- player habit summary across rounds

## Stretch Goals

- multiple bot personalities
- self-play pretraining before human play
- map variants
- reward hacking examples
- ablation mode: no adaptation vs adaptation
- replay viewer with policy overlays

## Risks

Main risks:
- state abstraction too weak, making learning feel fake
- reward shaping causing degenerate behavior
- too many actions too early
- adaptation being too slow for humans to notice

Mitigations:
- engineer state features first
- optimize for visible adaptation, not algorithm purity
- keep rounds short and frequent
- show the learner's internal signals in the UI

## Naming

Working title:
- `Adaptive Arena`

Alternatives:
- `Learning Opponent`
- `RL Duel Lab`
- `Exploit Me If You Can`

`Adaptive Arena` is the best fit for now because it sounds product-like without overselling the RL side.
