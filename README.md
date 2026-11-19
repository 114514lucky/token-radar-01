# token-radar-01

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/114514lucky/token-radar-01/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/114514lucky/token-radar-01/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

Token launch radar: scores every pre-token protocol in the sealed DefiLlama snapshot (758 protocols, as of 2026-11-14) and ranks them by implied value. Model `radar-2` in `lib/model.ts`: implied value from TVL, 7-day growth, square-root maturity, and a chain-breadth multiplier; the watchlist's own wrapped/staked/bridged rule filters the early rows. Result: 178 rows (40 watchlist + 138 clean pre-token), top Steakhouse Financial at an implied $660.4M. Node.js standard library only, no network, no dependencies. The dashboard in `dashboard/` is a static page; `screenshots/` shows the board, a protocol detail, and the filtered view.

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
