# Model fit — `radar-3` (token-radar-01)

Companion to `frozen-split-radar-3.md` (the freeze came first; this file
records what the frozen holdout returned). All numbers below are the
single frozen-holdout evaluation — no re-tuning after seeing them.

## Shipped model

`log10(mcap) = 2.7441 + 0.5630 × log10(TVL)`, i.e.
`implied = 10^2.7441 × TVL^0.563`, fitted by ordinary least squares in
log space on the 47 earlier-listed traded tokens (train only),
R² = 0.294. The shipped constants are the fit rounded to 4 decimals;
the verifier recomputes the OLS fit from the snapshot's train rows and
checks them. The flat baseline is the train median mcap/TVL, 0.191414.

## Frozen holdout (n = 48, one evaluation, same rows for every row)

| model | median miss | mean log bias | within ×3 | within ×10 |
|---|---|---|---|---|
| flat (train median 0.1914) | ×5.29 | −0.140 | 33.3% | 75.0% |
| **power-law OLS (shipped)** | **×3.01** | **+0.139** | **50.0%** | **75.0%** |
| power-law + shrunk category (dropped) | ×3.01 | +0.161 | 50.0% | 70.8% |
| radar-2 (old, same holdout) | ×4.79 | −0.016 | 35.4% | 70.8% |

Reading: the shipped model beats flat by 43% on the miss (ratio 0.568)
and lifts ×3 coverage from 33% to 50% on the same 48 rows. It lands
inside the field's held-out band (leaders ×2.45–×3.21, 45–58%) where
radar-2 (×4.79, 35%) did not. The dropped category variant ties the
shipped model on the miss and is worse on bias and ×10 coverage, which
vindicates dropping it under the freeze's 10% rule — it was never
adopted on holdout strength.

The bias is honest and two-sided: flat under-prices the holdout
(−0.140) and the power law over-prices it (+0.139), by about the same
amount. The later-listed cohort trades richer than the earlier-listed
one (median mcap/TVL 0.2554 vs 0.1914), and no intercept correction
was applied — correcting the intercept to the holdout would be tuning
to the holdout.

## Board consequences (value-if-launches, 198 rows)

| rank | protocol | implied | TVL |
|---|---|---|---|
| 1 | Sentora Curator | $114,582,377 | $2.76B |
| 2 | Steakhouse Financial | $114,498,040 | $2.75B |
| 3 | Gauntlet | $83,673,030 | $1.58B |
| 4 | Veda | $83,246,099 | $1.56B |
| 5 | USDD | $66,738,277 | $1.06B |

Total implied $2,532,826,472 (was $4,659,990,170 under radar-2). The
top value sits inside the leaders' $30–130M reference band without
any constant having been tuned to that band. Rank 1 changes hands
(Sentora, not Steakhouse) because the sub-linear power law compresses
the gap between the two largest TVLs; the tie-break is deterministic
(higher implied first, then slug order).

## Why the value is NOT multiplied by the token rate

The field's leaders print odds-weighted expected values (their totals
$1.1–1.5B, tops $27–126M). Ours prints value-if-launches, so our
total ($2.53B) is not directly comparable with theirs — it is the sum
of a different quantity. Multiplying by the token rate would treat a
cross-sectional share (the fraction of protocols in an age band that
record a token) as a launch probability, which is exactly the
misreading the label correction fixes. The token rate stays a
separate, correctly labelled column.

## What was tried and dropped (train-LOO basis, see the freeze doc)

Momentum (7-day change), age, chain count, Huber robust fit, shrunk
per-category factors, and any sibling/"kin of a token" discount. None
cleared the freeze's 10% LOO-improvement rule; the sibling rule has
no validation path from this snapshot at all. No competitor value was
copied and no constant was tuned to the leaders' band.

## Verification

- `verify-198-rows.py` (review package) recomputes every row from the
  sealed snapshot under the new formula, recomputes the OLS fit from
  the frozen train rows and checks the shipped constants, recomputes
  the cross-sectional check on the frozen holdout, and checks the
  split reproduces the frozen slug lists: 34/34.
- Two fresh runs into clean directories are byte-identical with each
  other and with the committed `out/` (board, data.js, dossier).
