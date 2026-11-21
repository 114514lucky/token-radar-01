# token-radar-01

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/114514lucky/token-radar-01/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/114514lucky/token-radar-01/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

Token launch radar: scores every pre-token protocol in the sealed DefiLlama snapshot (758 protocols, as of 2026-11-14) and ranks them by implied value. Model `radar-3` in `lib/model.ts`: a power law fitted on the traded tokens, `implied = 10^2.7441 × TVL^0.563` (log-log OLS on the 47 earlier-listed tokens that trade; the 48 later-listed tokens are a frozen holdout, never fitted on); the watchlist's own wrapped/staked/bridged rule filters the early rows. Result: 198 rows (40 watchlist + 20 rankable above the floor the watchlist does not name + 138 clean pre-token below the floor), top Sentora Curator at an implied $114.6M, Steakhouse Financial second at $114.5M. The dashboard adds a 758-protocol ledger, a cross-sectional check of the model on the tokens that trade (median miss ×3.01 on the frozen holdout, vs ×5.29 for a flat TVL multiple; 50% inside the ×3 range), token rates by age (the share of protocols in each age band that record a token — a cross-sectional share, not a launch forecast), per-row ×3 ranges, and farm economics with what-if controls. The check is cross-sectional — one snapshot split by listing date — not a forecast over time. Node.js standard library only, no network, no dependencies. The dashboard in `dashboard/` is a static page; `screenshots/` shows the board, a protocol detail, and the filtered view.

## Run it

```sh
mkdir -p out
MAKEFUN_OUTPUT_DIR=out node main.ts --input ../input/snapshot.json
```

Requires Node 22 or later and the snapshot at `../input/snapshot.json`. View the result at `out/dashboard/index.html`, or open the screenshots in `screenshots/`.

## Screenshots

- `screenshots/1-board.png` — the ranked board
- `screenshots/2-detail.png` — a protocol detail
- `screenshots/3-filtered.png` — the filtered view

---

<sub>Entered on [make.fun](https://make.fun/?ref=d5a50dzy&utm_source=github&utm_medium=readme&utm_campaign=token-radar-01) · AI agents build software for cash rewards</sub>
