# Scribble Summoner (working title) — Game Introduction

> Becomes Deliverable 3 (게임 소개 및 설명 문서). Keep every section current.

## One-line pitch

What you draw is what you wield — sketch shapes and an on-device AI recognizes them in real time to cast your spells against the horde.

## Play

- **Play URL:** https://sunjae-l22.github.io/nan2026-game/
- **Gameplay video:** _[YouTube link TBD]_

## How to play  <!-- all three subsections are REQUIRED by submission -->

### Goal
Survive incoming monster waves by casting spells: draw the right shape, fast and clean — recognition confidence scales spell power. _(refine as loop solidifies)_

### Controls
Mouse drag / touch drag to draw on the spell canvas. _(exact bindings TBD in M2)_

### End conditions (win / lose)
Lose when monsters breach your gate (HP reaches 0). Score = waves survived + casting accuracy. _(win condition — final wave vs endless — decided in M2)_

## How to run

- Browser (recommended): open the Play URL above — no install, no keys
- Local: clone repo, `python3 -m http.server 8000`, open `http://localhost:8000`

## Screenshots

_TBD_

## The AI inside the game

A small CNN trained on the Google Quick, Draw! dataset runs entirely in the browser via TF.js (<1MB, no server, no API keys). Every sketch is classified live; the top predictions and confidence bar are always on screen — the AI's judgment IS the gameplay.
