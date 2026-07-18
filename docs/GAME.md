# Scribble Summoner (working title) — Game Introduction

> Becomes Deliverable 3 (게임 소개 및 설명 문서). Keep every section current.

## One-line pitch

What you draw is what you wield — sketch shapes and an on-device AI recognizes them in real time to cast your spells against the horde.

## Play

- **Play URL:** https://sunjae-l22.github.io/nan2026-game/
- **Gameplay video:** _[YouTube link TBD]_

## How to play  <!-- all three subsections are REQUIRED by submission -->

### Goal
Defend the gate against 10 waves of doodle monsters — normals, swift blue darters (wave 4+), hulking tanks (wave 6+), and a crowned BOSS on the final wave. Draw spell shapes on the pad — the on-device AI recognizes them and casts the matching spell. Cleaner drawings = higher confidence = more power. Clearing a wave lets you pick 1 new spell card (start: 참격/sword + 체인 라이트닝/lightning, grow to all 8).

### Controls
- Draw: mouse drag / touch drag on the right-side pad (multi-stroke shapes fine)
- Cast: **Shift** (left or right — either hand) or **Enter** or the **CAST** button
- **Aim:** hover the battlefield with the mouse (or tap it on touch) before casting — the spell lands there; a dashed ghost shows the area of effect. No aim → smart auto-targeting
- Undo last stroke: **Backspace** · Clear pad: **Clear** button
- Pick a spell card: click, or keys **1/2/3** · Restart after game end: **R**

### End conditions (win / lose)
- **Win:** survive all 10 waves (VICTORY screen with score/kills/casts)
- **Lose:** gate HP reaches 0 (GAME OVER screen), instant restart with R

## How to run

- Browser (recommended): open the Play URL above — no install, no keys
- Local: clone repo, `python3 -m http.server 8000`, open `http://localhost:8000`

## Screenshots

_TBD_

## Sound

All audio is procedurally synthesized in-browser (WebAudio oscillators + filtered noise) — zero audio files, zero licensing. Per-spell cast sounds, kill pops, wave fanfares, boss stingers, win/lose jingles. Mute: 🔊 button or **M**.

## The AI inside the game

A small CNN trained on the Google Quick, Draw! dataset runs entirely in the browser via TF.js (<1MB, no server, no API keys). Every sketch is classified live; the top predictions and confidence bar are always on screen — the AI's judgment IS the gameplay.
