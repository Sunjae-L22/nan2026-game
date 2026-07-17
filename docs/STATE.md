# STATE — project memory

_Last updated: 2026-07-17 (session 1, M3 part 1 live-verified)_

## Facts

- Event: NAN 2026 Hackathon (NHN) — pre-task: build a game with AI tools
- Deadline: **2026-08-09 23:59 KST** (freeze target: 2026-08-09 morning, half-day buffer)
- Team: solo → Deliverable 5 (team roles) not required
- GitHub: **Sunjae-L22**, repo `nan2026-game` (public), dev in VS Code
- Play URL (LIVE, verified): https://sunjae-l22.github.io/nan2026-game/

## CONCEPT — LOCKED 2026-07-17

**Scribble Summoner (working title)** — draw-to-cast wave defense.
Monsters approach; player draws shapes (sword, shield, lightning, fire…) on a canvas; an on-device CNN (trained on Google Quick Draw data, served via TF.js, <1MB, fully client-side) classifies the sketch in real time — label + confidence always visible — and casts the matching spell, confidence scaling power. AI is the core input mechanic, on screen every ~3 seconds.

Fallback if recognition accuracy disappoints early: cut classes to 5–6 highly distinct shapes; hard pivot option is concept B (learning seeker) — decision point end of M1.

## Current status

- Live on GitHub Pages (verified in Chrome: 120 FPS, zero console errors)
- **M1 COMPLETE & LIVE-VERIFIED** (drew triangle/square/lightning in deployed lab.html via real browser: each recognized at 100.0%, no console errors). 8-class model, E2E 96.60% on 4,800 held-out drawings through the exact game pipeline (gate was 90%). Val 96.5%, all classes ≥93%. Inference 0.6ms, model 440KB, zero runtime dependencies.
- Final classes & spell mapping (draft): lightning=chain bolt, circle=shield, triangle=spike trap, star=big blast, cloud=poison cloud, sword=slash, square=stone wall, campfire=fire zone

## Next 3 steps

1. M3 pt3: sound (WebAudio synth), kill fx upgrade, wave banners, monster variety
2. M3 pt3: mobile layout pass (aim = tap already works); balance check at high waves
3. M4: title art, video shot list, PDFs

## M3 part 2 (2026-07-17) — playtest feedback round 2
- Aimed casting: hover/tap battlefield → spell lands there (dashed AoE ghost per spell); no aim → legacy auto-target. All spells take optional target, clamped to field. Tests 24 green.
- Cast key: L/R Shift (both hands OK, user request), Enter kept as secondary, CAST button for touch.
- Backlog (user, acknowledged): expand the card pool well beyond 8 (upgrades/modifiers) — post-M4 if time allows. Early-wave difficulty confirmed OK by participant.

## M3 part 1 (2026-07-17) — from participant playtest feedback
- Casting is now explicit: Enter/Space/CAST button; Backspace undoes a stroke. (Auto-cast removed — it broke multi-stroke shapes like campfire.)
- Skill draft: start with sword+lightning; each wave clear → pick 1 of 3 random locked spells; legend shows locks; sim pauses during pick. Tests: 20 green.
- LIVE-VERIFIED on Pages: Enter-cast consumed a drawn lightning (89%) → chain kill + score; two draft picks made in a real run (campfire, star) with legend unlocking correctly; bars mask locked classes; zero console errors. Participant playtested concurrently.

## M2 verification (2026-07-17, live on Pages)

- Full loop verified in real browser: title → START → waves spawn → draw-to-cast works (sloppy star at 50% → idle-cast per rules) → GAME OVER overlay on gate death → R restart → fresh run → VICTORY overlay via debug key. Zero console errors.
- 16 node logic tests green (all spells, blocking, shield, slow, burn, win/lose, confidence scaling).
- NOTE: Pages/browser cache serves stale files after push during dev — hard reload (Cmd+Shift+R) needed; judges unaffected (first visit).
- M3 polish list: GATE label overlaps HP bar; monster visual variety; sound; wave start banner; balance unknown at high waves.

## Milestones (each ends playable)

- **M1 (~7/20):** recognition proven in browser — draw → correct label ≥90% on chosen classes
- **M2 (~7/25):** core loop playable-ugly — waves, spells, win/lose, instant restart
- **M3 (~7/31):** balance + juice (particles, shake, sound, score pops) + mobile touch
- **M4 (~8/6):** polish, screenshots, video shot list + capture, 3 PDFs
- **8/8–8/9 AM:** freeze + full submission checklist from clean browser

## Decisions

- Concept A locked (see above); no revisiting
- Stack: vanilla Canvas/JS, ES modules, no build step. In-game AI: hand-written JS inference engine (src/nn.js) — TF.js dropped, zero runtime deps
- Neutral repo name `nan2026-game` → Pages URL stable; game title lives in README/docs
- Model trained offline with hand-rolled NumPy trainer (training/train_np.py — sandbox cannot run TF; gradcheck-verified). Only weights JSON shipped (assets/model/model.json)
- Docs in English during dev; final PDF language decided at export (likely Korean for NHN judges)

## Open risks

- Quick Draw dataset license (CC BY 4.0) + TF.js (Apache-2.0): verify and log in ASSETS.md the moment they enter the repo
- Git repo inside Google Drive-synced folder: works, but if sync/git conflicts appear, fallback = user clones from GitHub to local path
- Commit author email must be registered on the Sunjae-L22 GitHub account or commits won't link to profile
