// The token radar's model: one snapshot of the protocol universe in, one ranked board out.
//
// The board covers every slug in the snapshot's watchlist (the floor, never a ceiling) and may add
// rankable pre-token protocols the watchlist does not name, above the floor as well as below it:
// the early rows the radar exists to find. A protocol is pre-token when its index entry records no
// token (no market cap, no CoinGecko id, no symbol); the snapshot's live-token protocols are kept
// apart and shown as the market's own values, never mixed into the ranked board. Each row also
// carries its printed range (implied divided and multiplied by 3), its token rate (the share of
// protocols in its age band that record a token — a cross-sectional share among protocols that
// already exist, not a probability that this protocol will launch), and its farm economics as
// numbers; the board's ledger counts every protocol in the snapshot once, and the cross-sectional
// check prices the tokens that trade by splitting them into an earlier-listed train group and a
// later-listed frozen holdout.
//
// Implied value is a fitted power law in TVL, and nothing else:
//
//   implied = max(1, round(10 ^ (INTERCEPT_LOG10 + TVL_EXPONENT x log10(tvl_usd))))
//
// The two constants are fitted, not hand-picked: ordinary least squares of log10(market cap) on
// log10(TVL) over the 47 earlier-listed tokens that trade (the frozen train set — see
// docs/frozen-split-radar-3.md). The fit is log10(mcap) = 2.7441 + 0.5630 x log10(TVL),
// R-squared 0.294 on train. Momentum (7-day change), age and chain count were each tried and
// dropped: none improved the train leave-one-out median miss by the 10% margin the freeze
// requires (momentum and age made it worse). No protocol name is ever special-cased: the same
// function scores every row. The value is the value if a token launches; it is NOT multiplied
// by the token rate, because that rate is a cross-sectional share, not a launch probability.
//
// The snapshot is a single cross-section (as of 2026-11-14) and there is no earlier snapshot,
// so nothing here is a forecast over time. The cross-sectional check is two groups of one
// snapshot, split by listing date; its holdout numbers are coverage on those 48 frozen rows,
// not a hit rate on future tokens.

/** The snapshot's protocol entry: exactly the ten fields the sealed input carries. */
export interface SnapshotProtocol {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
}

/** The whole snapshot document. */
export interface Snapshot {
  as_of: string;
  source: string;
  floor_usd: number;
  protocols: SnapshotProtocol[];
  watchlist: string[];
}

/** The model's constants: the fitted power law, as the dashboard states it. Fitted by OLS
 *  of log10(market cap) on log10(TVL) over the 47 earlier-listed traded tokens (the frozen
 *  train set); the shipped values are the fit rounded to 4 decimals, and the verifier
 *  recomputes the fit from the snapshot and checks these constants. */
export interface ModelConstants {
  intercept_log10: number;
  tvl_exponent: number;
}

export const MODEL: ModelConstants = {
  intercept_log10: 2.7441,
  tvl_exponent: 0.563,
};

/** The model's version label: the dashboard names it and the rules quote it. */
export const MODEL_VERSION = 'radar-3';

/** The printed range around an implied value: a factor of 3 either way. The cross-sectional
 *  check measures how often the frozen holdout landed inside it. */
export const RANGE_FACTOR = 3;

/** Age buckets for the token rate: the share of protocols this old that record a token. */
export const TOKEN_RATE_BUCKETS: Array<{ label: string; lo: number; hi: number | null }> = [
  { label: 'under 6 months', lo: 0, hi: 180 },
  { label: '6–12 months', lo: 180, hi: 365 },
  { label: '1–2 years', lo: 365, hi: 730 },
  { label: '2–3 years', lo: 730, hi: 1095 },
  { label: 'over 3 years', lo: 1095, hi: null },
];

/** How many pre-token protocols below the watchlist floor the early radar carries, by TVL. */
export const EARLY_ROWS = 260;

/** How many live-token protocols the Live token view carries, by market cap. */
export const LIVE_ROWS = 24;

/** A farm step: the action, what it costs, and how long it takes. */
export interface FarmStep {
  text: string;
  cost: string;
  time: string;
}

/** One row of board.json: the ranked board's row. */
export interface BoardRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
  token_status: 'pre-token';
  age_days: number | null;
  implied_value_usd: number;
  range_low_usd: number;
  range_high_usd: number;
  token_rate: number;
  farm: FarmNumbers;
  model: {
    intercept_log10: number;
    tvl_exponent: number;
    log10_tvl_usd: number;
    age_days: number | null;
  };
  farm_steps: string[];
}

/** One row's farm economics as numbers, from the same functions that write its steps:
 *  the capital the plan deposits, the gas each week costs on its first chain, the gas of
 *  the first transaction, the hold in days, the weeks of qualifying actions, and the
 *  hours the plan takes. The dashboard's slice, net and verdict all derive from these. */
export interface FarmNumbers {
  capital_usd: number;
  gas_usd: number;
  setup_gas_usd: number;
  hold_days: number;
  weeks: number;
  hours: number;
}

/** The dashboard's compact view of one row. Farm steps come from board.json's own derivation,
 *  carried here so the page shows the same plan the board carries, never a second copy of it. */
export interface RadarRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  age_days: number | null;
  implied_value_usd: number;
  range_low_usd: number;
  range_high_usd: number;
  token_rate: number;
  farm: FarmNumbers;
  log10_tvl_usd: number;
  farm_steps: string[];
  watchlist: boolean;
}

/** A live-token protocol: it already trades, so the board shows the market's own value, not a model's. */
export interface LiveRow {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  mcap_usd: number | null;
  change_7d: number | null;
}

/** One bucket of the 758-protocol ledger: every protocol in the snapshot, counted once. */
export interface LedgerBucket {
  label: string;
  count: number;
  note: string;
}

/** The model's cross-sectional check on the tokens that trade: the live protocols are split
 *  by listing date into an earlier-listed train group (which fits the flat multiple and the
 *  power law — the power law is fitted before this check, on train alone) and a later-listed
 *  frozen holdout, which is priced by the model from TVL alone, and by the flat multiple for
 *  comparison. This is one snapshot split in two, not a forecast over time: there is no
 *  earlier snapshot, so no row here is priced before its listing date. Misses are medians
 *  of the absolute log error, shown as multiples, so a miss of x3.0 means the typical price
 *  lands within a factor of 3.0 either way. */
export interface CrossCheck {
  n_live: number;
  n_train: number;
  n_holdout: number;
  flat_multiple_train: number;
  model_miss_holdout: number;
  flat_miss_holdout: number;
  within_x3_holdout_pct: number;
  within_x10_holdout_pct: number;
  bias_holdout: number;
  range_factor: number;
}

/** One token-rate cohort: protocols listed in an age band, and the share that record a token.
 *  A cross-sectional share among protocols that already exist — not the probability that a
 *  protocol in the band will launch a token. */
export interface TokenRateCohort {
  label: string;
  lo_days: number;
  hi_days: number | null;
  n: number;
  token_rate: number;
}

/** Everything the dashboard needs: the board, the live set, and the model it runs. */
export interface RadarData {
  as_of: string;
  source: string;
  floor_usd: number;
  model: ModelConstants;
  model_version: string;
  watchlist_size: number;
  board_size: number;
  early_size: number;
  live_size: number;
  total_implied_usd: number;
  ledger: LedgerBucket[];
  cross_check: CrossCheck;
  token_rate_cohorts: TokenRateCohort[];
  rows: RadarRow[];
  live: LiveRow[];
}

/** Why the snapshot is not one this model can score. */
export class SnapshotError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SnapshotError';
  }
}

const DAY_MS = 86_400_000;

/** A whole day count from `from` to `to`, clamped at zero; null when either date is absent or bad. */
export function ageDays(asOf: string, listedAt: string | null): number | null {
  if (listedAt === null) return null;
  const a = Date.parse(`${asOf}T00:00:00Z`);
  const b = Date.parse(`${listedAt}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.max(0, Math.floor((a - b) / DAY_MS));
}

/** The fitted power law's implied value for one protocol: TVL alone, through the frozen
 *  train fit. Age is returned for the row's display and its token-rate band; it does not
 *  enter the value — the age term was tried on train and dropped (see the file header). */
export function impliedValue(protocol: SnapshotProtocol, asOf: string, model: ModelConstants): { implied: number; log10Tvl: number; age: number | null } {
  const age = ageDays(asOf, protocol.listed_at);
  const log10Tvl = Math.log10(protocol.tvl_usd);
  const implied = Math.max(1, Math.round(10 ** (model.intercept_log10 + model.tvl_exponent * log10Tvl)));
  return { implied, log10Tvl, age };
}

/** DefiLlama's version-marker rule: a name ending in a release is a pool of another protocol. */
const VERSIONED = /\s(V\d+(\.\d+)?|v\d+(\.\d+)?|\d+\.\d+)$/;

/** Whether a protocol records no token at all. */
export function isPreToken(p: SnapshotProtocol): boolean {
  return p.mcap_usd === null && p.gecko_id === null && p.symbol === null;
}

/** Categories that are a wrapped, staked or bridged product of a token that already trades. */
const WRAPPED_CATEGORIES = new Set(['Bridge', 'Canonical Bridge', 'Liquid Staking', 'Liquid Restaking', 'Restaked BTC', 'CEX']);
/** A name carrying a whole word wrapped, staked or staking, or beginning with an exchange's name. */
const WRAPPED_NAME = /\b(wrapped|staked|staking)\b/i;
const EXCHANGE_PREFIX = /^(Binance|Coinbase|Bybit|Kraken|Bitget|OKX|Bitfinex|Gemini)\b/i;

/** Whether a protocol is one the board may rank: pre-token, not an exchange, not a versioned pool,
 *  and not a wrapped, staked or bridged product of a token that already trades. The watchlist's
 *  own rule, applied to the early rows too, so the early radar finds launches, not wrappers. */
export function isRankable(p: SnapshotProtocol): boolean {
  return (
    isPreToken(p) &&
    !WRAPPED_CATEGORIES.has(p.category ?? '') &&
    !VERSIONED.test(p.name) &&
    !WRAPPED_NAME.test(p.name) &&
    !EXCHANGE_PREFIX.test(p.name)
  );
}

/** The snapshot's protocol by slug. */
function bySlug(protocols: SnapshotProtocol[]): Map<string, SnapshotProtocol> {
  return new Map(protocols.map((p) => [p.slug, p]));
}

/** The headline sentence's figures: how many watchlist slugs, how many rows, how many live protocols. */
export interface BoardSummary {
  watchlist_size: number;
  board_size: number;
  early_size: number;
  live_size: number;
}

/** The protocols the board ranks, strongest first, with ranks 1..n. */
export function buildBoard(snapshot: Snapshot, model: ModelConstants = MODEL): BoardRow[] {
  const index = bySlug(snapshot.protocols);
  const chosen = new Map<string, SnapshotProtocol>();
  // The watchlist is the floor: every slug, even one the snapshot no longer carries (it cannot, but the
  // board's coverage is the gate's row and is never gambled on a missing record).
  for (const slug of snapshot.watchlist) {
    const p = index.get(slug);
    if (p !== undefined) chosen.set(slug, p);
  }
  // The early radar: every rankable pre-token protocol the watchlist does not name, by TVL,
  // capped. The watchlist is the floor, never the ceiling: a rankable protocol above the floor
  // is ranked too, even when the watchlist does not name it. Never a replacement for a
  // watchlist row: a chosen protocol stays chosen.
  const early = snapshot.protocols
    .filter((p) => !chosen.has(p.slug) && isRankable(p))
    .sort((a, b) => b.tvl_usd - a.tvl_usd || (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0))
    .slice(0, EARLY_ROWS);
  for (const p of early) chosen.set(p.slug, p);

  const cohorts = tokenRateCohorts(snapshot);
  const scored = [...chosen.values()].map((p) => {
    const { implied, log10Tvl, age } = impliedValue(p, snapshot.as_of, model);
    return { p, implied, log10Tvl, age };
  });
  scored.sort((a, b) => b.implied - a.implied || (a.p.slug < b.p.slug ? -1 : a.p.slug > b.p.slug ? 1 : 0));
  return scored.map((s, i) => ({
    rank: i + 1,
    slug: s.p.slug,
    name: s.p.name,
    category: s.p.category,
    chains: s.p.chains,
    tvl_usd: s.p.tvl_usd,
    change_7d: s.p.change_7d,
    mcap_usd: s.p.mcap_usd,
    listed_at: s.p.listed_at,
    gecko_id: s.p.gecko_id,
    symbol: s.p.symbol,
    token_status: 'pre-token',
    age_days: s.age,
    implied_value_usd: s.implied,
    range_low_usd: Math.max(1, Math.round(s.implied / RANGE_FACTOR)),
    range_high_usd: Math.round(s.implied * RANGE_FACTOR),
    token_rate: tokenRateFor(s.age, cohorts),
    farm: farmNumerics(s.p, s.age),
    model: {
      intercept_log10: model.intercept_log10,
      tvl_exponent: model.tvl_exponent,
      log10_tvl_usd: round4(s.log10Tvl),
      age_days: s.age,
    },
    farm_steps: farmSteps(s.p, s.age).map(stepText),
  }));
}

const round4 = (n: number): number => Math.round(n * 1e4) / 1e4;

/** A step as one string: its action, then its cost and time, within the gate's 20..600 characters. */
export function stepText(step: FarmStep): string {
  let s = `${step.text} Cost: ${step.cost}. Time: ${step.time}.`;
  if (s.length > 600) s = `${s.slice(0, 596)}...`;
  if (s.length < 20) s = `${s} Hold the position and check the protocol's own page.`;
  return s;
}

/** The first chain a protocol names, or a neutral phrase. */
function chainOf(p: SnapshotProtocol): string {
  return p.chains.length > 0 ? p.chains[0]! : 'its main chain';
}

/** How much capital one farm position needs, from the protocol's own TVL. */
function capitalFor(p: SnapshotProtocol): number {
  if (p.tvl_usd >= 5_000_000_000) return 250;
  if (p.tvl_usd >= 1_000_000_000) return 150;
  if (p.tvl_usd >= 100_000_000) return 100;
  return 50;
}

/** How long to hold, from the protocol's age: younger protocols get a longer qualifying window. */
function holdDaysFor(age: number | null): number {
  if (age === null) return 30;
  if (age < 180) return 60;
  if (age < 365) return 45;
  return 30;
}

/** The category's one action, in the words a farmer can follow. */
function actionFor(p: SnapshotProtocol, capital: number, chain: string): string {
  const c = (p.category ?? '').toLowerCase();
  const name = p.name;
  if (c.includes('lend') || c.includes('cdp') || c.includes('collateral')) return `Supply $${capital} of USDC to ${name} on ${chain} and keep the position open.`;
  if (c.includes('dex') || c.includes('yield') || c.includes('leveraged farm')) return `Provide $${capital} of liquidity to ${name}'s main pool on ${chain} and keep the position open.`;
  if (c.includes('bridge')) return `Bridge $${capital} of USDC to ${chain} through ${name} and use the bridged funds in its app.`;
  if (c.includes('staking') || c.includes('restak')) return `Stake $${capital} of the chain's staking asset through ${name} and keep the receipt.`;
  if (c.includes('perpetual') || c.includes('derivative')) return `Deposit $${capital} of USDC as margin on ${name} and open one small hedge.`;
  if (c.includes('prediction')) return `Fund $${capital} and place one market position on ${name}.`;
  if (c.includes('curator') || c.includes('allocator')) return `Deposit $${capital} into a ${name} vault on ${chain} and keep the shares.`;
  if (c.includes('stable')) return `Mint or deposit $${capital} of the stable asset through ${name} on ${chain}.`;
  if (c.includes('rwa')) return `Mint $${capital} of the protocol's yield asset on ${chain} and hold it.`;
  if (c.includes('insurance')) return `Buy $${capital} of cover from ${name} on ${chain} and keep the policy.`;
  return `Deposit $${capital} of USDC into ${name} on ${chain} and keep the position open.`;
}

/**
 * A protocol's farm plan: six steps, each an action with a cost and a time. The plan is derived from
 * the protocol's own record (category, chains, TVL, age), never from a hand-written list of names.
 */
/** The median of a non-empty list: the middle value, or the mean of the two middles. */
export function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/** The dollar cost of one transaction on a chain, as a number: the same rule the steps print
 *  as words. Ethereum costs about $8, the cheap chains under $1, the rest about $3. */
export function gasUsdFor(chain: string): number {
  const c = chain.toLowerCase();
  if (c === 'ethereum') return 8;
  if (c === 'solana' || c === 'base' || c === 'arbitrum' || c === 'optimism' || c === 'polygon' || c === 'blast' || c === 'ink' || c === 'linea') return 1;
  return 3;
}

/** A row's farm economics as numbers, from the same functions that write its steps: the capital
 *  the plan deposits, the gas each weekly action costs on its first chain, the gas of the first
 *  transaction, the hold in days, the weeks of qualifying actions, and the hours the plan takes
 *  (35 fixed minutes: wallet, deposit, claim, log, plus 10 minutes a week). */
export function farmNumerics(p: SnapshotProtocol, age: number | null): FarmNumbers {
  const capital = capitalFor(p);
  const hold = holdDaysFor(age);
  const weeks = Math.ceil(hold / 7);
  const gas = gasUsdFor(chainOf(p));
  const hours = 35 / 60 + weeks / 6;
  return { capital_usd: capital, gas_usd: gas, setup_gas_usd: 3, hold_days: hold, weeks, hours: Math.round(hours * 100) / 100 };
}

/** The token-rate cohorts: every protocol with a listing date, banded by age, with the share
 *  that records a token. A protocol with no listing date takes the 1–2 year band's rate, the
 *  same band the unknown age (365 days) sits in. */
export function tokenRateCohorts(snapshot: Snapshot): TokenRateCohort[] {
  return TOKEN_RATE_BUCKETS.map((b) => {
    const inBand = snapshot.protocols.filter((p) => {
      if (p.listed_at === null) return false;
      const age = ageDays(snapshot.as_of, p.listed_at);
      return age !== null && age >= b.lo && (b.hi === null || age < b.hi);
    });
    const withToken = inBand.filter((p) => !isPreToken(p)).length;
    return {
      label: b.label,
      lo_days: b.lo,
      hi_days: b.hi,
      n: inBand.length,
      token_rate: inBand.length ? withToken / inBand.length : 0,
    };
  });
}

/** A row's token rate: its age band's token rate, or the 1–2 year band when its age is unknown. */
export function tokenRateFor(ageDaysValue: number | null, cohorts: TokenRateCohort[]): number {
  const age = ageDaysValue ?? 365;
  const idx = TOKEN_RATE_BUCKETS.findIndex((b) => age >= b.lo && (b.hi === null || age < b.hi));
  return cohorts[idx < 0 ? 2 : idx].token_rate;
}

/** The cross-sectional check: the tokens that trade, split by listing date into an
 *  earlier-listed train group and a later-listed frozen holdout. The train group sets the
 *  flat TVL multiple (its median mcap/TVL); the holdout is priced by the fitted power law
 *  from TVL alone, and by the flat multiple for comparison. Misses are medians of the
 *  absolute log error, shown as multiples, so a miss of x3.0 means the typical price lands
 *  within a factor of 3.0 either way. The split is the frozen one in
 *  docs/frozen-split-radar-3.md: sorted by (listed_at, slug), the first half trains, the
 *  rest is the holdout. One snapshot, two groups — not a forecast over time. */
export function computeCrossCheck(snapshot: Snapshot, model: ModelConstants): CrossCheck {
  const live = snapshot.protocols
    .filter((p) => p.mcap_usd !== null && p.mcap_usd > 0 && p.listed_at !== null)
    .sort((a, b) => {
      const d = (a.listed_at as string).localeCompare(b.listed_at as string);
      return d !== 0 ? d : a.slug.localeCompare(b.slug);
    });
  const half = Math.floor(live.length / 2);
  const train = live.slice(0, half);
  const holdout = live.slice(half);
  const flatMultiple = median(train.map((p) => (p.mcap_usd as number) / p.tvl_usd));
  const modelMiss: number[] = [];
  const flatMiss: number[] = [];
  let within3 = 0;
  let within10 = 0;
  let logSum = 0;
  for (const p of holdout) {
    const priced = impliedValue(p, snapshot.as_of, model);
    const ratio = priced.implied / (p.mcap_usd as number);
    const miss = Math.abs(Math.log(ratio));
    modelMiss.push(miss);
    flatMiss.push(Math.abs(Math.log((p.tvl_usd * flatMultiple) / (p.mcap_usd as number))));
    if (miss <= Math.log(RANGE_FACTOR)) within3 += 1;
    if (miss <= Math.log(10)) within10 += 1;
    logSum += Math.log(ratio);
  }
  return {
    n_live: live.length,
    n_train: train.length,
    n_holdout: holdout.length,
    flat_multiple_train: flatMultiple,
    model_miss_holdout: Math.exp(median(modelMiss)),
    flat_miss_holdout: Math.exp(median(flatMiss)),
    within_x3_holdout_pct: holdout.length ? (100 * within3) / holdout.length : 0,
    within_x10_holdout_pct: holdout.length ? (100 * within10) / holdout.length : 0,
    bias_holdout: holdout.length ? logSum / holdout.length : 0,
    range_factor: RANGE_FACTOR,
  };
}

/** The ledger: every protocol in the snapshot, counted once, in the order the page lists them.
 *  Ranked rows come first (watchlist, then rankable above the floor the watchlist does not name,
 *  then the early rows below it); the rest are the tokens that trade, the tokens on record
 *  without a market cap, and the protocols the watchlist's own rule sets aside. Anything that
 *  fits none of these is counted under "other" rather than dropped. */
export function computeLedger(snapshot: Snapshot, board: BoardRow[]): LedgerBucket[] {
  const onBoard = new Map(board.map((r) => [r.slug, r]));
  const watchlist = new Set(snapshot.watchlist);
  const counts = new Map<string, number>();
  const bump = (key: string) => counts.set(key, (counts.get(key) ?? 0) + 1);
  for (const p of snapshot.protocols) {
    if (onBoard.has(p.slug)) {
      if (watchlist.has(p.slug)) bump('watchlist');
      else if (p.tvl_usd >= snapshot.floor_usd) bump('off-list');
      else bump('early');
    } else if (p.mcap_usd !== null) bump('token-trades');
    else if (p.gecko_id !== null || p.symbol !== null) bump('token-on-record');
    else if (p.category === 'Bridge' || p.category === 'Canonical Bridge') bump('bridge');
    else if (p.category === 'Liquid Staking' || p.category === 'Liquid Restaking' || p.category === 'Restaked BTC') bump('liquid-staking');
    else if (p.category === 'CEX') bump('exchange-custody');
    else if (VERSIONED.test(p.name)) bump('versioned');
    else if (WRAPPED_NAME.test(p.name) || EXCHANGE_PREFIX.test(p.name)) bump('wrapped-or-exchange');
    else bump('other');
  }
  const defs: Array<[string, string, string]> = [
    ['watchlist', 'Watchlist', 'every protocol the watchlist names, all 40 of them'],
    ['off-list', 'Off list · above floor', 'rankable by the same rule, above $50M, not on the watchlist'],
    ['early', 'Early · below floor', 'rankable pre-token protocols under $50M of TVL'],
    ['token-trades', 'Already trade', 'a market cap on record'],
    ['token-on-record', 'Token on record', 'a token listed, no market cap on record'],
    ['bridge', 'Bridge', 'a bridge or canonical bridge product of a token that trades'],
    ['liquid-staking', 'Liquid staking', 'a liquid-staked, restaked or wrapped-staked product'],
    ['exchange-custody', 'Exchange custody', 'an exchange custody product'],
    ['versioned', 'Versioned', 'a numbered version of a protocol, not the protocol itself'],
    ['wrapped-or-exchange', 'Wrapped / exchange', 'a wrapped token or an exchange-named product'],
    ['other', 'Other', 'fits none of the buckets above'],
  ];
  return defs.map(([key, label, note]) => ({ label, count: counts.get(key) ?? 0, note }));
}

/** What one transaction costs on a chain: cheap on a rollup or Solana, dear on Ethereum mainnet. */
function gasFor(chain: string): string {
  const c = chain.toLowerCase();
  if (c === 'ethereum') return 'about $8 of gas';
  if (c === 'solana' || c === 'base' || c === 'arbitrum' || c === 'optimism' || c === 'polygon' || c === 'blast' || c === 'ink' || c === 'linea') return 'under $1 of gas';
  return 'about $3 of gas';
}

/** The weekly qualifying action, by what the protocol does. */
function weeklyFor(p: SnapshotProtocol): string {
  const c = (p.category ?? '').toLowerCase();
  if (c.includes('lend') || c.includes('cdp') || c.includes('collateral')) return 'Make one qualifying action each week: add or remove a small amount of collateral, or borrow and repay a little.';
  if (c.includes('dex') || c.includes('yield')) return 'Make one qualifying action each week: swap a small amount in the main pool, or add and remove a little liquidity.';
  if (c.includes('bridge')) return 'Make one qualifying action each week: bridge a small amount and use it in the destination app.';
  if (c.includes('staking') || c.includes('restak')) return 'Make one qualifying action each week: stake a little more, or restake the rewards you earned.';
  if (c.includes('perpetual') || c.includes('derivative')) return 'Make one qualifying action each week: open and close one small hedged position.';
  if (c.includes('curator') || c.includes('allocator')) return 'Make one qualifying action each week: deposit a little into a vault, or move between its vaults.';
  if (c.includes('prediction')) return 'Make one qualifying action each week: place one small market position and settle it.';
  return 'Make one qualifying action each week, such as a deposit, a borrow, a swap or a vote.';
}

export function farmSteps(p: SnapshotProtocol, age: number | null): FarmStep[] {
  const chain = chainOf(p);
  const capital = capitalFor(p);
  const hold = holdDaysFor(age);
  const action = actionFor(p, capital, chain);
  const gas = gasFor(chain);
  return [
    {
      text: `Use a fresh wallet that holds only the funds you plan to farm, and keep its seed phrase offline.`,
      cost: 'under $3 of gas for the first transaction',
      time: '5 minutes',
    },
    {
      text: action,
      cost: `$${capital} of capital and ${gas}`,
      time: '15 minutes to set up',
    },
    {
      text: weeklyFor(p),
      cost: `${gas} a week`,
      time: '10 minutes a week',
    },
    {
      text: `Hold the position for at least ${hold} days so the activity is counted in more than one snapshot.`,
      cost: `the $${capital} stays in the position`,
      time: `${hold} days`,
    },
    {
      text: `Before you withdraw, open the protocol's own points or rewards page and claim only from the link it publishes.`,
      cost: 'no fee to check, and never pay to claim',
      time: '10 minutes',
    },
    {
      text: `Write the wallet, the dates and every transaction in a farm log so you can repeat the position or unwind it.`,
      cost: 'nothing but the log',
      time: '5 minutes',
    },
  ];
}

/** The live-token protocols, by market cap, for the dashboard's Live token view. */
export function liveRows(snapshot: Snapshot): LiveRow[] {
  return snapshot.protocols
    .filter((p) => !isPreToken(p) && p.category !== 'CEX')
    .sort((a, b) => (b.mcap_usd ?? 0) - (a.mcap_usd ?? 0) || b.tvl_usd - a.tvl_usd)
    .slice(0, LIVE_ROWS)
    .map((p) => ({
      slug: p.slug,
      name: p.name,
      category: p.category,
      chains: p.chains,
      tvl_usd: p.tvl_usd,
      mcap_usd: p.mcap_usd,
      change_7d: p.change_7d,
    }));
}

/** A board row's compact form for data.js, carrying the farm plan board.json carries so the
 *  page shows the same plan, never a second derivation of it. */
export function radarRow(row: BoardRow, watchlist: Set<string>): RadarRow {
  return {
    rank: row.rank,
    slug: row.slug,
    name: row.name,
    category: row.category,
    chains: row.chains,
    tvl_usd: row.tvl_usd,
    change_7d: row.change_7d,
    mcap_usd: row.mcap_usd,
    listed_at: row.listed_at,
    age_days: row.age_days,
    implied_value_usd: row.implied_value_usd,
    range_low_usd: row.range_low_usd,
    range_high_usd: row.range_high_usd,
    token_rate: row.token_rate,
    farm: row.farm,
    log10_tvl_usd: row.model.log10_tvl_usd,
    farm_steps: row.farm_steps,
    watchlist: watchlist.has(row.slug),
  };
}

/** Everything the dashboard renders, from the snapshot. */
export function buildRadar(snapshot: Snapshot, model: ModelConstants = MODEL): { board: BoardRow[]; radar: RadarData } {
  const board = buildBoard(snapshot, model);
  const live = liveRows(snapshot);
  const early = board.filter((r) => !snapshot.watchlist.includes(r.slug)).length;
  const radar: RadarData = {
    as_of: snapshot.as_of,
    source: snapshot.source,
    floor_usd: snapshot.floor_usd,
    model,
    model_version: MODEL_VERSION,
    watchlist_size: snapshot.watchlist.length,
    board_size: board.length,
    early_size: early,
    live_size: live.length,
    total_implied_usd: board.reduce((sum, r) => sum + r.implied_value_usd, 0),
    ledger: computeLedger(snapshot, board),
    cross_check: computeCrossCheck(snapshot, model),
    token_rate_cohorts: tokenRateCohorts(snapshot),
    rows: board.map((r) => radarRow(r, new Set(snapshot.watchlist))),
    live,
  };
  return { board, radar };
}

/** The snapshot out of a file's text, refused unless it is the shape the model scores. */
export function parseSnapshot(text: string): Snapshot {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new SnapshotError('snapshot.json is not JSON');
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new SnapshotError('snapshot.json is not a JSON object');
  const o = raw as Record<string, unknown>;
  if (typeof o.as_of !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(o.as_of)) throw new SnapshotError('snapshot.json has no as_of date');
  if (typeof o.source !== 'string') throw new SnapshotError('snapshot.json has no source');
  if (typeof o.floor_usd !== 'number' || !Number.isSafeInteger(o.floor_usd) || o.floor_usd <= 0) throw new SnapshotError('snapshot.json has no floor_usd');
  if (!Array.isArray(o.protocols)) throw new SnapshotError('snapshot.json has no protocols array');
  if (!Array.isArray(o.watchlist) || o.watchlist.some((s) => typeof s !== 'string')) throw new SnapshotError('snapshot.json has no watchlist of slugs');
  const protocols = o.protocols.map((v, i) => {
    if (typeof v !== 'object' || v === null || Array.isArray(v)) throw new SnapshotError(`snapshot.json's protocol ${i} is not an object`);
    const p = v as Record<string, unknown>;
    if (typeof p.slug !== 'string' || typeof p.name !== 'string' || typeof p.tvl_usd !== 'number' || !Number.isFinite(p.tvl_usd)) {
      throw new SnapshotError(`snapshot.json's protocol ${i} lacks a slug, a name or a TVL`);
    }
    return {
      slug: p.slug,
      name: p.name,
      category: typeof p.category === 'string' ? p.category : null,
      chains: Array.isArray(p.chains) ? p.chains.filter((c): c is string => typeof c === 'string') : [],
      tvl_usd: p.tvl_usd,
      change_7d: typeof p.change_7d === 'number' && Number.isFinite(p.change_7d) ? p.change_7d : null,
      mcap_usd: typeof p.mcap_usd === 'number' && Number.isFinite(p.mcap_usd) ? p.mcap_usd : null,
      listed_at: typeof p.listed_at === 'string' ? p.listed_at : null,
      gecko_id: typeof p.gecko_id === 'string' ? p.gecko_id : null,
      symbol: typeof p.symbol === 'string' ? p.symbol : null,
    };
  });
  return {
    as_of: o.as_of,
    source: o.source,
    floor_usd: o.floor_usd,
    protocols,
    watchlist: o.watchlist as string[],
  };
}

/** Why a board is not one the gate will take, or null: coverage, ranks, order, one shared implied value, and farm steps. */
export function boardIssue(board: BoardRow[], snapshot: Snapshot): string | null {
  const slugs = new Set(board.map((r) => r.slug));
  const missing = snapshot.watchlist.filter((s) => !slugs.has(s));
  if (missing.length > 0) return `the board misses ${missing.length} watchlist slug${missing.length === 1 ? '' : 's'}: ${missing.slice(0, 5).join(', ')}`;
  const ranks = board.map((r) => r.rank).sort((a, b) => a - b);
  for (let i = 0; i < ranks.length; i++) if (ranks[i] !== i + 1) return `rank ${i + 1} is ${ranks[i]}`;
  for (let i = 1; i < board.length; i++) if (board[i]!.implied_value_usd > board[i - 1]!.implied_value_usd) return `row ${i + 1} outranks row ${i} on implied value`;
  if (board.length >= 2 && board[0]!.implied_value_usd === board[board.length - 1]!.implied_value_usd) {
    return `all ${board.length} rows share the same implied value $${board[0]!.implied_value_usd}: a board that ranks nothing by value is not a ranking`;
  }
  for (const r of board) {
    const steps = r.farm_steps;
    if (steps.length < 3 || steps.length > 12) return `${r.slug} has ${steps.length} farm steps`;
    for (const s of steps) if (s.length < 20 || s.length > 600) return `${r.slug} has a farm step of ${s.length} characters`;
    if (!Number.isSafeInteger(r.implied_value_usd) || r.implied_value_usd <= 0) return `${r.slug} has implied value ${r.implied_value_usd}`;
  }
  return null;
}

/** A compact data.js: the dashboard's whole dataset as one script, no fetch and no network. */
export function dataScript(radar: RadarData): string {
  return `window.RADAR=${JSON.stringify(radar)};\n`;
}
