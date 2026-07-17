# STATE — project memory

_Last updated: 2026-07-17 (session 1)_

## Facts

- Event: NAN 2026 Hackathon (NHN) — pre-task: build a game with AI tools
- Deadline: **2026-08-09 23:59 KST** (freeze target: 2026-08-09 morning, half-day buffer)
- Team: solo → Deliverable 5 (team roles) not required
- GitHub: **Sunjae-L22**, repo `nan2026-game` (public), dev in VS Code
- Play URL (once Pages enabled): https://sunjae-l22.github.io/nan2026-game/
- Preference: AI must be *visible inside gameplay*, no genre restrictions

## Current status

- Repo scaffolded: index.html + src/ + assets/ + docs/ + README, smoke-test page (canvas, FPS counter, pointer input)
- Git initialized on `main`, first commit done
- NOT yet on GitHub — waiting on user: create repo, push, enable Pages
- Game concept: 3 proposals presented, decision pending/just made — see Decisions

## Next 3 steps

1. User: create `Sunjae-L22/nan2026-game` (public) on GitHub → push → enable Pages (Settings → Pages → main / root)
2. Claude: verify live Pages URL (cold load, console clean, mobile viewport)
3. Start core loop of chosen concept (playable-ugly ASAP)

## Decisions

- Web-first, no build step: plain index.html + /src served from main root
- Neutral repo name `nan2026-game` → Pages URL stays stable regardless of final title
- Stack decided after concept pick (Phaser 3 CDN / vanilla Canvas / TF.js as needed)
- Docs kept in English during dev; final PDF language decided at export time (likely Korean for NHN judges)

## Open risks

- Git repo lives inside Google Drive-synced folder (required for Claude access). Small repo → OK, but if sync/git conflicts appear, fallback: user clones from GitHub to a local path and Claude works via pushed state. Watch closely.
- Commit author email is leeseonjae0111@gmail.com — must be registered on the Sunjae-L22 GitHub account or commits won't link to profile (submission requires visible history)
- Pages deploy unverified until first push
