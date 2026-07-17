# NAN 2026 Hackathon — [Game Title TBD]

**▶ Play now: <https://sunjae-l22.github.io/nan2026-game/>**

*(Screenshot / GIF here once gameplay exists)*

A browser game built for the NAN 2026 Hackathon (NHN), created end-to-end with AI tools. Runs entirely client-side — no install, no account, no API keys.

## Status

Scaffold + deploy pipeline stage. Game concept selection in progress — see [`docs/STATE.md`](docs/STATE.md).

## Run locally

Static site, no build step:

```bash
# from repo root — any static server works
python3 -m http.server 8000
# then open http://localhost:8000
```

Or use the VS Code Live Server extension.

## Repo layout

```
index.html      entry point (GitHub Pages serves from main branch root)
src/            game source
assets/         art, audio, fonts (all attributed in docs/ASSETS.md)
docs/           living documentation → final PDF deliverables
```

## Docs

- [`docs/GAME.md`](docs/GAME.md) — game intro: goal / controls / end conditions
- [`docs/AI_USAGE.md`](docs/AI_USAGE.md) — AI tools, prompts, in-game AI architecture
- [`docs/ASSETS.md`](docs/ASSETS.md) — external assets & open-source licenses
- [`docs/STATE.md`](docs/STATE.md) — project state, next steps, risks
