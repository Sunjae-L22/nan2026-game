# AI Usage Log

> Becomes Deliverable 4 (AI 활용 기술 문서). Append an entry after every significant AI-assisted step: date, tool, representative prompt, what it produced, how it was integrated/modified. External assets & libraries live in ASSETS.md (merged into the same PDF).

## In-game AI architecture

A small CNN (~83k params) classifies the player's sketch in real time, fully client-side:

```
player strokes ──▶ src/preprocess.js (bbox-normalize → supersampled
                   analytic-coverage rasterize → 28×28 grayscale)
               ──▶ src/nn.js (hand-written conv/pool/dense/softmax,
                   zero dependencies, ~0.6 ms)
               ──▶ 8-class softmax → spell cast (confidence = power)
```

Trained offline on Google Quick, Draw! stroke data rasterized by the *same* `preprocess.js` the game uses — training and gameplay share one code path, so there is no train/serve skew. No API keys, no backend, no external ML runtime is shipped: the "engine" is ~150 lines of readable JS in this repo.

## Log

### 2026-07-17 — Project scaffold
- **Tool:** Claude (Cowork mode)
- **Prompt (near-verbatim):** "컨셉 무관한 인프라 먼저 세팅해: 레포 스캐폴드(index.html/src/assets/docs) + Pages 배포 동작 확인 + docs 템플릿(STATE/GAME/AI_USAGE/ASSETS) + README + 첫 커밋. 지침 §5.1대로 컨셉 3개 제안하고 하나 추천해줘."
- **Produced:** Full repo scaffold — smoke-test page (canvas + FPS + pointer input), four living-doc templates, README, .gitignore, git history started. Plus three game concept proposals.
- **Integration:** Committed as-is; smoke test to be replaced by real game code.

### 2026-07-17 — M1: sketch-recognition pipeline (the AI inside the game)
- **Tool:** Claude (Cowork mode) — design, all code, training runs, verification
- **Representative prompts:** "학습/실플레이 도메인 갭을 없애기 위해 게임과 동일한 JS 래스터라이저로 학습 데이터를 만들어라", "45초 실행 상한이 있는 샌드박스에서 재개 가능한 학습 루프로 재설계", "JS 추론 엔진이 학습 프레임워크 출력과 일치하는지 골든 테스트로 증명하라"
- **What was built:**
  - `src/preprocess.js` — stroke→28×28 rasterizer, SHARED between training and gameplay (eliminates train/inference domain gap)
  - `training/rasterize.mjs` — builds training arrays from Quick Draw *simplified strokes* using that exact game code (HTTP range requests fetch only ~20MB slices of the dataset)
  - `training/train_np.py` — **hand-rolled NumPy CNN trainer** (im2col conv, Adam, dropout, resumable checkpoints). Written because TensorFlow could not be installed in the build sandbox; correctness proven by numerical gradient check (worst rel. err 1.2e-07)
  - `src/nn.js` — dependency-free CNN inference engine (~150 lines). Golden test: max prob diff vs trainer = 4.2e-07 on 64 vectors
  - `dev/lab.html` — interactive recognition demo (draw → live confidence bars)
- **Model:** conv3x3x16/pool/conv3x3x32/pool/dense96/dense8, ~83k params, 440KB JSON, ~0.6ms/prediction in browser
- **Classes (8):** lightning, circle, triangle, star, cloud, sword, square, campfire — selected from 12 candidates by cross-class confusion analysis (dropped moon: 82% acc, confused with circle)
- **Verification:** E2E gate on 4,800 held-out raw drawings run through the full game pipeline: **96.60% accuracy** (per-class 93.7–98.5%). Val accuracy 96.5%.

### 2026-07-17 — M3 (part 1): playtest-driven redesign of the casting loop
- **Tool:** Claude (Cowork mode)
- **Trigger:** Participant playtest feedback — (1) multi-stroke shapes (e.g. campfire) were impossible to cast under the auto-cast timer; (2) all-spells-from-start felt flat.
- **Prompt (near-verbatim):** "캠프파이어는 한 획으로 그릴 수 없어 발동이 어렵다 — 다 그리고 엔터로 발동하게. 그리고 웨이브 클리어마다 스킬 카드를 골라 하나씩 해금되게 하자."
- **Produced:** Explicit casting (Enter/Space/CAST button, Backspace undo) replacing auto-cast; roguelite card draft — start with 2 spells, +1 pick per wave clear from 3 random locked options (sim pauses during pick). 4 new logic tests (20 total green).
- **Integration:** committed after live verification on Pages.
