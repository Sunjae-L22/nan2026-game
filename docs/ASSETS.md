# External Assets & Open-Source Libraries

> Merged into Deliverable 4. RULE: log every external asset/library **the moment it enters the repo** — source URL + license. Prefer CC0. When in doubt about a license, don't use the asset.

| Name | Type | Source URL | License | Used in |
|------|------|-----------|---------|---------|
| Google Quick, Draw! dataset | Training data (sketches) | https://github.com/googlecreativelab/quickdraw-dataset | CC BY 4.0 | Trains the sketch-recognition CNN. Dataset NOT shipped in repo/game — only model weights derived from it. Attribution: "Data made available by Google, Inc. under CC BY 4.0" |
| TensorFlow (Keras) | Build-time training tool | https://www.tensorflow.org | Apache-2.0 | Offline model training only (`/training`). Not shipped — in-game inference is dependency-free hand-written JS |
