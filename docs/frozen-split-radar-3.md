# Frozen train / holdout split — model `radar-3` (token-radar-01)

Written and committed **before** the holdout is evaluated and before any
`radar-3` model code is written. Nothing in this file may change after the
holdout numbers are known, except to correct a factual error about the
split itself (and any correction must be noted here with a date).

## Snapshot

- Sealed input: `input/snapshot.json`, as of **2026-11-14**, 758 protocols,
  floor $50,000,000, watchlist 40.
- SHA-256: `42a71213519479f3a180cc5010cbbf6bd18a2447fa0ad29e4c5122b6c9184393`
- The snapshot is a **single cross-section**. There are no historical
  snapshots, so no check below is a forecast over time and none is a
  time backtest. The split below divides one snapshot's traded tokens
  into two cross-sectional groups by listing date; "earlier-listed" and
  "later-listed" are group labels, not a walk-forward.

## Traded set (the only rows any fit or check may learn from)

Protocols with `mcap_usd > 0` **and** a `listed_at` date: **n = 95**.
Sorted by `(listed_at, slug)`; the first 47 are train, the last 48 are
holdout. This is the same split the old `radar-2` backtest used
(older half / newer half), so `radar-3` holdout numbers are directly
comparable with the old miss ×4.79 / flat ×5.29 — under the corrected
cross-sectional reading.

### Train — earlier-listed (n = 47, listed 2021-10-21 .. 2024-02-09)

superfluid, cbridge, rocket-pool, gains-network, stader, gearbox,
tectonic, across, railgun, astar-dapps-staking, api3, metalx-lending,
portal, concentrator, symbiosis, pinksale, team-finance, aura, dolomite,
okx, swissborg, gate, ston.fi, exactly, veno-finance, flokifi-locker,
blur-bids, inverse-finance-firm, nexo, liqwid, streamflow, mexc,
equilibria, eigencloud, stusdt, gravity-bridge, fx-protocol,
hydration-dex, ekubo, sdai, hipo, frankencoin, meth-protocol, renzo,
brickken, veranta, merlins-seal

### Holdout — later-listed (n = 48, listed 2024-02-18 .. 2026-08-26)

b2-buzz, merlinswap, evaa-protocol, morpheusai, taiko-bridge,
harmonix-finance, usual-usd0, kinetic, waterneuron, pumpbtc,
aquarius-stellar, biconomy.com, treehouse-protocol, babylon-protocol,
kyros, reservoir-protocol, bitkub, resolv-usr, kaio, concrete,
infrared-finance, looped-hype, resupply, anvil, uranium.io,
solomon-usdv, zyfai, usd-ai, zerobase-cedefi, cap, mansory, xsy,
yield-basis, falcon-finance, solstice,bitkan, rain, obol, re,
flying-tulip-lend, chutes, hyperlane, bitway-earn, grove-finance,
zama, huma, wise-token, fables

### Split properties (known before fitting)

- Train median mcap/TVL 0.1914; holdout median 0.2554.
- Category mix differs: the holdout holds 7 RWA and 7 Basis Trading
  rows; Basis Trading does not occur in train at all, and RWA occurs
  only twice. Any per-category factor fitted on train would fall back
  to "no adjustment" for most holdout rows. This is one reason the
  category term was dropped (see below).
- Outliers exist in train (e.g. nexo mcap/TVL 69.4, concentrator
  0.0013); the fit is ordinary least squares in log space, not
  winsorised, so the outliers stay in and their pull is visible in
  the LOO table.

## Metrics (one definition, used for model and baselines alike)

All errors are natural-log errors on market cap,
`e = ln(predicted / actual)`:

- **median miss** = `exp(median |e|)`, shown as a multiple (×3.17 means
  the typical price lands within a factor of 3.17 either way);
- **mean log bias** = `mean(e)` (negative = the model under-prices);
- **within ×3** = share with `|e| ≤ ln 3`; **within ×10** likewise.
  The printed ×3 range on every board row uses the same factor 3.

## Baselines (fitted on train only, scored on the same holdout)

- **flat**: predict `mcap = TVL × median(mcap/TVL)` over train
  (median 0.1914).
- **power-law**: OLS of `log10(mcap)` on `log10(TVL)` over train.
  This is also the shipped model (see decision), so its holdout
  numbers are the model's numbers, not a separate baseline to beat.

## Term selection rule (fixed before the holdout is scored)

Leave-one-out cross-validation **on train only** (n = 47; each row
held out once, the spec refit on the other 46). An added term is kept
only if it improves the train-LOO median miss by **at least 10%**
over the plain power-law — a clear margin, not noise, on a 47-row
train set. Anything below that is dropped for parsimony, even if its
LOO number is marginally better.

## LOO on train only (the whole basis for the decision)

| spec | train-LOO miss | bias | within ×3 |
|---|---|---|---|
| flat | ×4.06 | −0.230 | 47% |
| **power-law (OLS)** | **×3.17** | −0.012 | 47% |
| power-law + momentum (7d change) | ×3.56 | −0.064 | 49% |
| power-law + momentum + age | ×3.81 | −0.063 | 47% |
| power-law + momentum + age + chains | ×3.75 | −0.066 | 45% |
| power-law + age + chains | ×3.54 | −0.009 | 47% |
| power-law, Huber robust fit | ×3.40 | +0.031 | 47% |
| power-law + shrunk category factor (n≥3, shrink n/(n+3)) | ×3.05 | −0.064 | 47% |

## Decision (from train only, before the holdout is scored)

- **Ship the plain power-law OLS.** Full-train fit:
  `log10(mcap) = 2.7441 + 0.5630 × log10(TVL)`, i.e.
  `value-if-launches = 10^2.7441 × TVL^0.5630`, R² = 0.294 on train.
  It beats flat by 22% on train-LOO (×3.17 vs ×4.06) with near-zero
  bias; every extra term fails the 10% rule or hurts outright.
- **Dropped, with reasons:** momentum (LOO worse; its fitted sign is
  negative, −0.59, which has no economic reading here and looks like
  noise); age and chain-count terms (LOO worse in every combination
  tried); Huber robust fit (LOO worse, ×3.40); shrunk category
  factor (LOO ×3.05, only 4% better than plain power-law — below the
  10% rule — fitted on 3–6 rows per category, and most holdout rows
  sit in categories train never saw, so the factor would mostly be
  1.0 on the holdout anyway).
- **No sibling / "kin of a token" discount.** No rule derivable from
  this snapshot alone was found that prices a second token off a
  first: the traded tokens are the tokens themselves, so a discount
  for pre-token rows with a token-trading namesake cannot be
  validated on any held-out row. It is not fitted and not applied;
  the field's "Kin of a token" bucket is not copied.
- **No copying of competitor values.** The fitted constants come only
  from this snapshot's train rows. The field's $27–126M top band is a
  reference for plausibility, not a target the constants were tuned
  to; if the fitted model lands outside it, that is reported as-is.

## What the holdout evaluation must do (once, after this freeze)

Score **flat** and the **shipped power-law** on the frozen 48-row
holdout with the metrics above, and report all three numbers (miss,
bias, within ×3) for both on the same rows. Also report the dropped
shrunk-category variant's holdout numbers for transparency, labelled
as dropped — it must not become the shipped model on the strength of
a holdout look. If the shipped model does not beat flat on the
holdout, that is reported plainly and the model is not re-tuned
against the holdout; the honest fallback is the `radar-2` board with
its weak numbers labelled as they are.

## Two labelling corrections that ship with `radar-3` (not model fits)

1. **"Odds" → token rate.** The old "Odds" column is the share of
   protocols in the same age band that record a token — a
   cross-sectional share among protocols that already exist, not the
   probability that this protocol will launch a token. It is renamed
   **token rate** everywhere (column, detail drawer, cohorts) with
   that definition printed on the page.
2. **"Backtest" → cross-sectional check.** The old split-by-listing-
   date check is renamed everywhere (code, data, dashboard, docs) to
   a **cross-sectional check**: one snapshot, two groups by listing
   date, priced from TVL alone. No wording may present it as a
   prediction over time, a walk-forward, or a forecast of future
   launches. The ×3 range coverage is coverage on the frozen
   holdout, not a hit rate on future tokens.
