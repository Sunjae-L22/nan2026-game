# STATE — project memory

_Last updated: 2026-07-17 (session 1)_

## Facts

- Event: NAN 2026 Hackathon (NHN) — pre-task: build a game with AI tools
- Deadline: **2026-08-09 23:59 KST** (freeze target: 2026-08-09 morning, half-day buffer)
- Team: solo → Deliverable 5 (team roles) not required
- GitHub: **Sunjae-L22**, repo `nan2026-game` (public), dev in VS Code
- Play URL (once Pages enabled): https://sunjae-l22.github.io/nan2026-game/

## CONCEPT — LOCKED 2026-07-17

**Scribble Summoner (working title)** — draw-to-cast wave defense.
Monsters approach; player draws shapes (sword, shield, lightning, fire…) on a canvas; an on-device CNN (trained on Google Quick Draw data, served via TF.js, <1MB, fully client-side) classifies the sketch in real time — label + confidence always visible — and casts the matching spell, confidence scaling power. AI is the core input mechanic, on screen every ~3 seconds.

Fallback if recognition accuracy disappoints early: cut classes to 5–6 highly distinct shapes; hard pivot option is concept B (learning seeker) — decision point end of M1.

## Current status

- Repo scaffolded + git history started (main). Concept locked. NOT yet on GitHub — waiting on user: create repo, push, enable Pages.

## Next 3 steps

1. User: create `Sunjae-L22/nan2026-game` (public) on GitHub → push → enable Pages (Settings → Pages → Deploy from a branch → main / root)
2. Claude: verify live Pages URL (cold load <3s, zero console errors, mobile viewport)
3. M1 build: drawing canvas + 28×28 preprocessing + train CNN on Quick Draw classes → TF.js model → in-browser recognition demo page

## Milestones (each ends playable)

- **M1 (~7/20):** recognition proven in browser — draw → correct label ≥90% on chosen classes
- **M2 (~7/25):** core loop playable-ugly — waves, spells, win/lose, instant restart
- **M3 (~7/31):** balance + juice (particles, shake, sound, score pops) + mobile touch
- **M4 (~8/6):** polish, screenshots, video shot list + capture, 3 PDFs
- **8/8–8/9 AM:** freeze + full submission checklist from clean browser

## Decisions

- Concept A locked (see above); no revisiting
- Stack: vanilla Canvas/JS + TF.js (CDN) — no Phaser needed for this concept, no build step
- Neutral repo name `nan2026-game` → Pages URL stable; game title lives in README/docs
- Model trained offline (script kept in repo under /training), only converted TF.js artifacts shipped
- Docs in English during dev; final PDF language decided at export (likely Korean for NHN judges)

## Open risks

- **Model accuracy/UX** — mitigations above; decision point end of M1
- Quick Draw dataset license (CC BY 4.0) + TF.js (Apache-2.0): verify and log in ASSETS.md the moment they enter the repo
- Git repo inside Google Drive-synced folder: works, but if sync/git conflicts appear, fallback = user clones from GitHub to local path
- Commit author email must be registered on the Sunjae-L22 GitHub account or commits won't link to profile
- Pages deploy unverified until first push
