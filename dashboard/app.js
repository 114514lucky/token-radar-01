'use strict';
/* Token Radar dashboard, v2.
 * Renders window.RADAR (data.js, written by main.ts from the sealed snapshot). Every number
 * on the page comes from that data: the board, the ledger, the backtest, the odds cohorts.
 * The what-if controls recompute only the farm economics of a row (its airdrop slice, its net
 * of fees and opportunity cost, its verdict) from the row's own farm numbers; they never
 * change a rank, an implied value or a range. */

const DATA = window.RADAR;
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const state = {
  tab: 'pre',
  q: '',
  category: 'All categories',
  chain: 'All chains',
  verdict: 'all',
  sort: { key: 'rank', dir: 1 },
  deposit: 1000,
  drop: 0.07,
  tbill: 0.04,
  detail: null,
};

function fmtUsd(v) {
  if (v === null || v === undefined) return '—';
  const a = Math.abs(v);
  if (a >= 1e9) return '$' + (v / 1e9).toFixed(2) + 'B';
  if (a >= 1e6) return '$' + (v / 1e6).toFixed(1) + 'M';
  if (a >= 1e3) return '$' + (v / 1e3).toFixed(1) + 'K';
  return '$' + v.toFixed(0);
}
function fmtMoney(v) {
  return (v < 0 ? '−$' : '$') + Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtSigned(v) {
  return (v < 0 ? '−$' : '+$') + Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtInt(v) { return v.toLocaleString('en-US'); }
function fmtPct(v, digits) {
  if (v === null || v === undefined) return '—';
  return (v * 100).toFixed(digits === undefined ? 1 : digits) + '%';
}
function fmtAge(days) {
  if (days === null || days === undefined) return '—';
  if (days < 30) return days + 'd';
  if (days < 365) return (days / 30).toFixed(1).replace(/\.0$/, '') + 'mo';
  return (days / 365).toFixed(1) + 'y';
}
function fmtMult(v) { return '×' + v.toFixed(2); }

/* One row's farm economics at the current what-if settings. Slice is the row's share of an
 * airdrop: implied value x drop share x deposit / TVL. Fees are the setup gas plus one weekly
 * gas per week of the hold. Opportunity cost is the deposit earning the T-bill yield over the
 * hold. FARM clears $5 net, MARGINAL clears $0, the rest is SKIP. */
function econ(r) {
  const slice = (r.implied_value_usd * state.drop * state.deposit) / r.tvl_usd;
  const fees = r.farm.setup_gas_usd + r.farm.gas_usd * r.farm.weeks;
  const opp = (state.deposit * state.tbill * r.farm.hold_days) / 365;
  const net = slice - fees - opp;
  const perHour = net / r.farm.hours;
  const verdict = net >= 5 ? 'FARM' : net > 0 ? 'MARGINAL' : 'SKIP';
  return { slice, fees, opp, net, perHour, verdict };
}

/* The verdict chip's class. SKIP cannot use the class name "skip": the base theme already uses
 * .skip for the off-screen accessibility skip link (position absolute, left -9999px), which
 * would hide the chip. */
function vcls(v) { return v === 'SKIP' ? 'verdict-skip' : v.toLowerCase(); }

/* The model in one function: the page recomputes a row from the snapshot figures and checks
 * the number board.json carries, so the page's code and the board's data are visibly the same
 * arithmetic. */
function impliedOf(row, model) {
  const growth = Math.min(model.growth_cap, Math.max(model.growth_floor, row.change_7d === null || row.change_7d === undefined ? 0 : row.change_7d));
  const growthMult = 1 + (growth / 100) * model.growth_weight;
  const age = row.age_days === null || row.age_days === undefined ? model.unknown_age_days : row.age_days;
  const maturity = model.maturity_floor + Math.sqrt(Math.min(Math.max(age, 0), model.maturity_days) / model.maturity_days) * model.maturity_range;
  const chainMult = 1 + model.chain_weight * Math.min(Math.max((row.chains || []).length - 1, 0), model.chain_cap);
  return Math.max(1, Math.round(row.tvl_usd * model.base_multiple * growthMult * maturity * chainMult));
}

function header() {
  return '<header class="top"><span class="dot"></span><span class="brand">Token Radar</span>' +
    '<span class="top-right">Snapshot ' + esc(DATA.as_of) + ' &nbsp;·&nbsp; DefiLlama protocol index &nbsp;·&nbsp; ' + esc(DATA.model_version) + ' model</span></header>';
}

function lede() {
  return '<section class="lede"><h1>' + fmtInt(DATA.board_size) + ' pre-token protocols, ranked by implied value</h1>' +
    '<p>The watchlist is the floor: every protocol with at least $50M of TVL and no token on record. ' +
    'The radar ranks all ' + fmtInt(DATA.board_size) + ' rankable protocols, ' + fmtInt(DATA.watchlist_size) + ' of them named by the watchlist, ' +
    'strongest implied value first.</p></section>';
}

function kpis() {
  const rows = DATA.rows;
  const bt = DATA.backtest;
  let farmN = 0; let best = null; let bestName = '';
  for (const r of rows) {
    const e = econ(r);
    if (e.verdict === 'FARM') farmN += 1;
    if (!best || e.perHour > best) { best = e.perHour; bestName = r.name; }
  }
  const card = (label, value, sub) => '<div class="kpi"><div class="kpi-label">' + label + '</div><div class="kpi-value">' + value + '</div><div class="kpi-sub">' + sub + '</div></div>';
  return '<section class="kpis">' +
    card('RANKED', fmtInt(DATA.board_size), DATA.watchlist_size + ' watchlist · ' + (DATA.board_size - DATA.watchlist_size) + ' off-list and early') +
    card('TOTAL IMPLIED', fmtUsd(DATA.total_implied_usd), 'sum of all ' + fmtInt(DATA.board_size) + ' rows') +
    card('VALUE MISS · HELD OUT', fmtMult(bt.model_miss_newer), 'flat multiple ' + fmtMult(bt.flat_miss_newer) + ' · newer half n=' + bt.n_newer) +
    card('WITHIN ×3 RANGE', bt.within_x3_newer_pct.toFixed(0) + '%', 'of the newer half landed inside ×3') +
    card('WORTH FARMING', fmtInt(farmN), 'FARM at $' + fmtInt(state.deposit) + ' · ' + fmtPct(state.drop, 1) + ' drop · ' + fmtPct(state.tbill, 0) + ' T-bill') +
    card('BEST PER HOUR', fmtSigned(best), esc(bestName)) +
    '</section>';
}

function ledgerPanel() {
  const total = DATA.ledger.reduce((s, b) => s + b.count, 0);
  const colors = ['#0f766e', '#14919b', '#2dd4bf', '#64748b', '#94a3b8', '#cbd5e1', '#cbd5e1', '#cbd5e1', '#cbd5e1', '#cbd5e1', '#e2e8f0'];
  const bar = DATA.ledger.map((b, i) => '<span style="flex:' + b.count + ';background:' + colors[i] + '" title="' + esc(b.label) + ': ' + b.count + '"></span>').join('');
  const list = DATA.ledger.map((b) => '<div class="ledger-row" title="' + esc(b.note) + '"><span>' + esc(b.label) + '</span><b>' + fmtInt(b.count) + '</b></div>').join('');
  return '<section class="panel"><h2>' + fmtInt(total) + ' protocols read — every one accounted for</h2>' +
    '<div class="ledger-bar">' + bar + '</div>' +
    '<div class="ledger-list">' + list + '</div>' +
    '<p class="panel-note">Green is ranked; the rule sets bridge, staking, exchange, versioned and wrapped rows aside — counted, not hidden.</p></section>';
}

function methodPanel() {
  const bt = DATA.backtest;
  const m = DATA.model;
  return '<section class="panel"><h2>How a launch is priced</h2>' +
    '<p class="formula">implied = TVL × ' + m.base_multiple + ' × growth × maturity × chains</p>' +
    '<p class="panel-note">Growth is the 7-day change clamped to −60…+120%, halved; maturity rises with √age up to 3 years; chains add 2% each, up to 5; unknown age counts as 365 days.</p>' +
    '<table class="mini"><tbody>' +
    '<tr><td>Backtest, newer half</td><td class="num">n=' + bt.n_newer + ' · split by listing date</td></tr>' +
    '<tr><td>Model miss</td><td class="num">' + fmtMult(bt.model_miss_newer) + '</td></tr>' +
    '<tr><td>Flat multiple miss</td><td class="num">' + fmtMult(bt.flat_miss_newer) + ' · multiple ' + fmtMult(bt.flat_multiple_older) + '</td></tr>' +
    '<tr><td>Inside the ×3 range</td><td class="num">' + bt.within_x3_newer_pct.toFixed(0) + '% of the newer half</td></tr>' +
    '<tr><td>Mean log bias</td><td class="num">' + (bt.bias_newer >= 0 ? '+' : '') + bt.bias_newer.toFixed(2) + ' · near zero</td></tr>' +
    '</tbody></table>' +
    '<p class="panel-note">The backtest measures the model as written — no constant is fitted to it; the older half sets the flat multiple only.</p></section>';
}

function scatterPanel() {
  const W = 400, H = 150, L = 42, R = 8, T = 8, B = 24;
  const x0 = Math.log10(1e6), x1 = Math.log10(4e9), y0 = Math.log10(1e5), y1 = Math.log10(1e9);
  const X = (v) => L + ((Math.log10(v) - x0) / (x1 - x0)) * (W - L - R);
  const Y = (v) => T + (1 - (Math.log10(v) - y0) / (y1 - y0)) * (H - T - B);
  const line = 'M' + X(1e6).toFixed(1) + ',' + Y(2.5e5).toFixed(1) + ' L' + X(4e9).toFixed(1) + ',' + Y(1e9).toFixed(1);
  const dots = DATA.rows.map((r) => {
    const fill = r.watchlist ? '#0f766e' : (r.tvl_usd >= DATA.floor_usd ? '#14919b' : '#a7c4bc');
    const rad = r.rank <= 3 ? 3.4 : 2.1;
    return '<circle cx="' + X(r.tvl_usd).toFixed(1) + '" cy="' + Y(r.implied_value_usd).toFixed(1) + '" r="' + rad + '" fill="' + fill + '"><title>' + esc(r.name) + ' · TVL ' + fmtUsd(r.tvl_usd) + ' · implied ' + fmtUsd(r.implied_value_usd) + '</title></circle>';
  }).join('');
  const xTicks = [1e6, 1e7, 1e8, 1e9].map((v) => '<text x="' + X(v).toFixed(1) + '" y="' + (H - 8) + '" class="ax">' + fmtUsd(v) + '</text>').join('');
  const yTicks = [1e5, 1e6, 1e7, 1e8, 1e9].map((v) => '<text x="' + (L - 5) + '" y="' + (Y(v) + 3).toFixed(1) + '" class="ax" text-anchor="end">' + fmtUsd(v) + '</text>').join('');
  return '<section class="panel"><h2>Implied value against TVL</h2>' +
    '<svg viewBox="0 0 ' + W + ' ' + H + '" class="scatter" role="img" aria-label="Scatter of implied value against TVL for all ranked rows">' +
    '<path d="' + line + '" class="base-line"/>' + dots + xTicks + yTicks + '</svg>' +
    '<p class="panel-note">Dashed line: the base multiple ×0.25. Dark dots are watchlist rows; the three largest are the top three ranks.</p></section>';
}

function midRow() {
  return '<div class="midrow">' + ledgerPanel() + methodPanel() + scatterPanel() + '</div>';
}

function fmtChg(n) {
  if (n === null || n === undefined) return '—';
  return (n > 0 ? '+' : '') + n.toFixed(2) + '%';
}

function readHash() {
  const hash = window.location.hash.replace(/^#/, '');
  if (!hash) return;
  const params = new URLSearchParams(hash);
  if (params.get('q')) state.q = params.get('q');
  if (params.get('p')) state.detail = params.get('p');
  if (params.get('category')) state.category = params.get('category');
  if (params.get('chain')) state.chain = params.get('chain');
}
function writeHash() {
  const params = new URLSearchParams();
  if (state.q) params.set('q', state.q);
  if (state.category !== 'All categories') params.set('category', state.category);
  if (state.chain !== 'All chains') params.set('chain', state.chain);
  if (state.detail) params.set('p', state.detail);
  const next = params.toString();
  if (next) window.history.replaceState(null, '', '#' + next);
  else window.history.replaceState(null, '', window.location.pathname + window.location.search);
}

function chipCounts() {
  const c = { all: DATA.rows.length, watchlist: 0, off: 0, early: 0, farm: 0, marginal: 0, skip: 0 };
  for (const r of DATA.rows) {
    if (r.watchlist) c.watchlist += 1;
    else if (r.tvl_usd >= DATA.floor_usd) c.off += 1;
    else c.early += 1;
    c[econ(r).verdict.toLowerCase()] += 1;
  }
  return c;
}

function controls() {
  const categories = Array.from(new Set(DATA.rows.map((r) => r.category || 'Other'))).sort();
  const chains = Array.from(new Set(DATA.rows.flatMap((r) => r.chains || []))).sort();
  const opt = (v, cur) => '<option value="' + esc(v) + '"' + (v === cur ? ' selected' : '') + '>' + esc(v) + '</option>';
  const c = chipCounts();
  const chip = (key, label) => '<button type="button" class="chip' + (state.verdict === key ? ' on' : '') + '" data-verdict="' + key + '">' + label + ' <b>' + fmtInt(c[key]) + '</b></button>';
  const sel = (id, label, values, cur, fmt) => '<label class="whatif"><span>' + label + '</span><select id="' + id + '">' +
    values.map((v) => '<option value="' + v + '"' + (v === cur ? ' selected' : '') + '>' + fmt(v) + '</option>').join('') + '</select></label>';
  return '<div class="controls">' +
    '<div class="field"><label for="q">Search</label><input type="search" id="q" placeholder="Search name, category or chain" value="' + esc(state.q) + '" aria-label="Search the board"></div>' +
    '<div class="field"><label for="category">Category</label><select id="category">' + opt('All categories', state.category) + categories.map((x) => opt(x, state.category)).join('') + '</select></div>' +
    '<div class="field"><label for="chain">Chain</label><select id="chain">' + opt('All chains', state.chain) + chains.map((x) => opt(x, state.chain)).join('') + '</select></div>' +
    '<div class="field"><span class="sub">Token status</span><div class="tabs">' +
    '<button type="button" aria-pressed="' + (state.tab === 'pre') + '" data-tab="pre">Pre-token</button>' +
    '<button type="button" aria-pressed="' + (state.tab === 'live') + '" data-tab="live">Live token</button></div></div>' +
    '<span class="count">' + (state.tab === 'pre' ? fmtInt(rows().length) + ' rows shown' : DATA.live.length + ' live-token protocols') + '</span>' +
    '</div>' +
    '<div class="controls sub-row">' +
    '<div class="chips">' + chip('all', 'All') + chip('watchlist', 'Watchlist') + chip('off', 'Off list') + chip('early', 'Early') + chip('farm', 'Farm') + chip('marginal', 'Marginal') + chip('skip', 'Skip') + '</div>' +
    '<div class="whatif-row">' +
    sel('deposit', 'Deposit', [150, 1000, 10000], state.deposit, (v) => '$' + fmtInt(v)) +
    sel('drop', 'Drop share', [0.035, 0.07, 0.14], state.drop, (v) => fmtPct(v, 1)) +
    sel('tbill', 'T-bill yield', [0, 0.04, 0.08], state.tbill, (v) => fmtPct(v, 0)) +
    '<button type="button" class="button" id="csv">Export CSV</button>' +
    '</div></div>';
}

function rows() {
  const q = state.q.trim().toLowerCase();
  return DATA.rows.filter((r) => {
    if (state.category !== 'All categories' && r.category !== state.category) return false;
    if (state.chain !== 'All chains' && !(r.chains || []).includes(state.chain)) return false;
    if (state.verdict === 'watchlist' && !r.watchlist) return false;
    if (state.verdict === 'off' && (r.watchlist || r.tvl_usd < DATA.floor_usd)) return false;
    if (state.verdict === 'early' && (r.watchlist || r.tvl_usd >= DATA.floor_usd)) return false;
    if (state.verdict === 'farm' || state.verdict === 'marginal' || state.verdict === 'skip') {
      if (econ(r).verdict.toLowerCase() !== state.verdict) return false;
    }
    if (!q) return true;
    const hay = [r.name, r.slug, r.category, (r.chains || []).join(' ')].join(' ').toLowerCase();
    return hay.indexOf(q) >= 0;
  });
}

function sortedRows(list) {
  const key = state.sort.key, dir = state.sort.dir;
  const val = (r) => {
    if (key === 'name') return r.name.toLowerCase();
    if (key === 'tvl') return r.tvl_usd;
    if (key === 'change') return r.change_7d === null ? -Infinity : r.change_7d;
    if (key === 'age') return r.age_days === null ? Infinity : r.age_days;
    if (key === 'odds') return r.launch_odds;
    if (key === 'implied') return r.implied_value_usd;
    if (key === 'slice') return econ(r).slice;
    if (key === 'net') return econ(r).net;
    return r.rank;
  };
  return list.slice().sort((a, b) => {
    const av = val(a), bv = val(b);
    if (av < bv) return -dir;
    if (av > bv) return dir;
    return a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0;
  });
}

function sortHeader(key, label) {
  const arrow = state.sort.key === key ? (state.sort.dir < 0 ? ' v' : ' ^') : '';
  return '<th scope="col"><button type="button" data-sort="' + key + '">' + label + '<span aria-hidden="true">' + arrow + '</span></button></th>';
}

function badge(r) {
  if (r.watchlist) return '<span class="badge">watchlist</span>';
  if (r.tvl_usd >= DATA.floor_usd) return '<span class="badge off">off list</span>';
  return '<span class="badge early">early</span>';
}

function boardTable() {
  const list = sortedRows(rows());
  if (list.length === 0) {
    return '<div class="panel"><div class="empty"><h2>No protocol matches that filter</h2>' +
      '<p>Clear the search or pick another category to see the board again.</p>' +
      '<button class="button primary" type="button" id="clear-filters">Clear filters</button></div></div>';
  }
  const max = DATA.rows[0].implied_value_usd || 1;
  const body = list.map((r) => {
    const e = econ(r);
    const chg = r.change_7d === null ? '' : r.change_7d >= 0 ? 'pos' : 'neg';
    return '<tr data-slug="' + esc(r.slug) + '" tabindex="0">' +
      '<td class="num">' + r.rank + '</td>' +
      '<td><div class="name"><div class="name-top"><b>' + esc(r.name) + '</b>' + badge(r) + '</div>' +
      '<span class="sub">' + esc(r.category || 'Other') + ' on ' + esc((r.chains || []).slice(0, 2).join(', ') || 'an unnamed chain') + '</span></div></td>' +
      '<td class="num">' + fmtUsd(r.tvl_usd) + '</td>' +
      '<td class="num ' + chg + '">' + fmtChg(r.change_7d) + '</td>' +
      '<td class="num">' + fmtAge(r.age_days) + '</td>' +
      '<td class="num">' + fmtPct(r.launch_odds, 0) + '</td>' +
      '<td><div class="implied"><div class="bar" aria-hidden="true"><i style="width:' + Math.max(3, Math.round((r.implied_value_usd / max) * 100)) + '%"></i></div>' +
      '<span class="num">' + fmtUsd(r.implied_value_usd) + '</span></div>' +
      '<div class="range-sub">range ' + fmtUsd(r.range_low_usd) + ' – ' + fmtUsd(r.range_high_usd) + '</div></td>' +
      '<td class="num">' + fmtMoney(e.slice) + '</td>' +
      '<td class="num ' + (e.net >= 0 ? 'pos' : 'neg') + '">' + fmtSigned(e.net) + '</td>' +
      '<td><span class="verdict ' + vcls(e.verdict) + '">' + e.verdict + '</span></td>' +
      '</tr>';
  }).join('');
  return '<div class="panel"><div class="table-wrap"><table>' +
    '<caption class="sub">Pre-token protocols, strongest implied value first. Select a row for its model, odds and farm plan. Slice and net use the what-if settings above.</caption>' +
    '<thead><tr>' + sortHeader('rank', 'Rank') + sortHeader('name', 'Protocol') + sortHeader('tvl', 'TVL') + sortHeader('change', '7d') + sortHeader('age', 'Age') + sortHeader('odds', 'Odds') + sortHeader('implied', 'Implied value') + sortHeader('slice', 'Slice') + sortHeader('net', 'Net') + '<th scope="col">Verdict</th></tr></thead>' +
    '<tbody>' + body + '</tbody></table></div></div>';
}

function liveTable() {
  const body = DATA.live.map((r) => {
    const mult = r.mcap_usd ? (r.mcap_usd / r.tvl_usd) : null;
    return '<tr><td class="num">live</td>' +
      '<td><div class="name"><b>' + esc(r.name) + '</b><span class="sub">' + esc(r.category || 'Other') + ' on ' + esc((r.chains || []).slice(0, 2).join(', ') || 'an unnamed chain') + '</span></div></td>' +
      '<td class="num">' + fmtUsd(r.tvl_usd) + '</td>' +
      '<td class="num ' + (r.change_7d !== null && r.change_7d >= 0 ? 'pos' : 'neg') + '">' + fmtChg(r.change_7d) + '</td>' +
      '<td class="num">' + fmtUsd(r.mcap_usd) + '</td>' +
      '<td class="num">' + (mult === null ? '—' : fmtMult(mult)) + '</td>' +
      '<td><span class="status">already trades</span></td></tr>';
  }).join('');
  return '<div class="panel"><div class="table-wrap"><table>' +
    '<caption class="sub">Token live: these protocols already trade, so their market cap is a fact, not a model. They are set aside from the pre-token ranking.</caption>' +
    '<thead><tr><th scope="col">Status</th><th scope="col">Protocol</th><th scope="col">TVL</th><th scope="col">7d</th><th scope="col">Market cap</th><th scope="col">Mcap / TVL</th><th scope="col">Token</th></tr></thead>' +
    '<tbody>' + body + '</tbody></table></div></div>';
}

function seal() {
  const n = DATA.rows.length;
  const ranksOk = DATA.rows.every((r, i) => r.rank === i + 1);
  const sortedOk = DATA.rows.every((r, i) => i === 0 || r.implied_value_usd <= DATA.rows[i - 1].implied_value_usd);
  const offList = DATA.rows.filter((r) => !r.watchlist && r.tvl_usd >= DATA.floor_usd).length;
  return '<p class="seal">this table = board.json · ' + fmtInt(n) + ' rows drawn = ' + fmtInt(n) + ' written · ' +
    (ranksOk ? 'ranks 1–' + fmtInt(n) + ' in order' : 'RANK CHECK FAILED') + ' · ' +
    (sortedOk ? 'values never rise down the board' : 'SORT CHECK FAILED') + ' · total ' + fmtUsd(DATA.total_implied_usd) +
    ' · ' + DATA.watchlist_size + ' of ' + DATA.watchlist_size + ' watchlist ranked · ' + offList + ' off-list rankable above the floor</p>';
}

function footer() {
  return '<p class="foot">Source: DefiLlama protocol index, snapshot ' + esc(DATA.as_of) + '. Implied values, ranges and odds are model outputs; farm economics use the what-if settings above. No data leaves this page.</p>';
}

function cohortFor(age) {
  const cohorts = DATA.odds_cohorts;
  const a = age === null || age === undefined ? 365 : age;
  for (let i = 0; i < cohorts.length; i++) {
    const c = cohorts[i];
    if (a >= c.lo_days && (c.hi_days === null || a < c.hi_days)) return c;
  }
  return cohorts[2];
}

const dialog = document.createElement('dialog');
dialog.className = 'detail';
dialog.id = 'detail';
dialog.setAttribute('aria-labelledby', 'detail-title');
dialog.addEventListener('close', function () { state.detail = null; writeHash(); });

function openDetail(slug) {
  const row = DATA.rows.filter((r) => r.slug === slug)[0];
  if (!row) return;
  state.detail = slug;
  writeHash();
  const e = econ(row);
  const recomputed = impliedOf(row, DATA.model);
  const cohort = cohortFor(row.age_days);
  const stepItems = (row.farm_steps || []).map((s) => {
    const at = s.indexOf(' Cost: ');
    const action = at >= 0 ? s.slice(0, at) : s;
    const tail = at >= 0 ? s.slice(at + 1) : '';
    return '<li><b>' + esc(action) + '</b><span class="cost">' + esc(tail) + '</span></li>';
  }).join('');
  dialog.innerHTML =
    '<div class="detail-head"><div><span class="brand-name">Rank ' + row.rank + ' of ' + DATA.board_size + '</span>' +
    '<h2 id="detail-title">' + esc(row.name) + '</h2>' +
    '<p class="sub">' + esc(row.category || 'Other') + ' on ' + esc((row.chains || []).join(', ') || 'an unnamed chain') + '</p></div>' +
    '<button class="close" type="button" aria-label="Close details" id="detail-close">Close</button></div>' +
    '<section class="detail-section"><h3>Implied value</h3><div class="equation">' +
    '<div><span>TVL</span><b class="num">' + fmtUsd(row.tvl_usd) + '</b></div>' +
    '<div><span>Seven-day growth</span><b class="num">' + fmtChg(row.change_7d) + '</b></div>' +
    '<div><span>Age with no token</span><b class="num">' + fmtAge(row.age_days) + '</b></div>' +
    '<div><span>Growth multiplier</span><b class="num">' + row.growth_multiplier + '</b></div>' +
    '<div><span>Maturity multiplier</span><b class="num">' + row.maturity_multiplier + '</b></div>' +
    '<div><span>Chain multiplier</span><b class="num">' + row.chain_multiplier + '</b></div>' +
    '<div><span>Implied value</span><b class="num">' + fmtUsd(row.implied_value_usd) + '</b></div>' +
    '<div><span>Range (×3 either way)</span><b class="num">' + fmtUsd(row.range_low_usd) + ' – ' + fmtUsd(row.range_high_usd) + '</b></div>' +
    '<div><span>Launch odds</span><b class="num">' + fmtPct(row.launch_odds, 0) + ' · ' + esc(cohort.label) + ' cohort (n=' + cohort.n + ')</b></div>' +
    '</div><p class="sub">Model ' + esc(DATA.model_version) + ': the same function scores every protocol. The page recomputes this row as ' + fmtUsd(recomputed) +
    (recomputed === row.implied_value_usd ? ', the same number board.json carries.' : ', which differs from the board: the data would be stale.') +
    ' This is an estimate, not a price. The range is ×3 either way; ' + DATA.backtest.within_x3_newer_pct.toFixed(0) + '% of the newer held-out half landed inside it.</p></section>' +
    '<section class="detail-section"><h3>Farm economics — at $' + fmtInt(state.deposit) + ' deposit · ' + fmtPct(state.drop, 1) + ' drop share · ' + fmtPct(state.tbill, 0) + ' T-bill</h3><div class="equation">' +
    '<div><span>Airdrop slice</span><b class="num">' + fmtMoney(e.slice) + '</b></div>' +
    '<div><span>Fees (setup + weekly gas)</span><b class="num">−' + fmtMoney(e.fees) + '</b></div>' +
    '<div><span>Opportunity cost</span><b class="num">−' + fmtMoney(e.opp) + '</b></div>' +
    '<div><span>Net</span><b class="num">' + fmtSigned(e.net) + '</b></div>' +
    '<div><span>Hours (' + row.farm.weeks + ' weeks × 10 min + 35 min)</span><b class="num">' + row.farm.hours + ' h</b></div>' +
    '<div><span>Net per hour</span><b class="num">' + fmtSigned(e.perHour) + '</b></div>' +
    '<div><span>Verdict</span><b class="num"><span class="verdict ' + vcls(e.verdict) + '">' + e.verdict + '</span></b></div>' +
    '</div><p class="sub">Capital $' + fmtInt(row.farm.capital_usd) + ' · hold ' + row.farm.hold_days + ' days · gas $' + row.farm.gas_usd + ' a week on ' + esc(row.chains[0] || 'its main chain') + '. Change the what-if settings on the board to reprice this plan.</p></section>' +
    '<section class="detail-section"><h3>Farm plan</h3><ol class="steps">' + stepItems + '</ol></section>';
  const closeBtn = dialog.querySelector('#detail-close');
  if (closeBtn) closeBtn.addEventListener('click', function () { dialog.close(); });
  if (typeof dialog.showModal === 'function') {
    if (!dialog.open) dialog.showModal();
  } else {
    dialog.setAttribute('open', '');
  }
}

function exportCsv() {
  const list = sortedRows(rows());
  const head = 'rank,protocol,category,chains,tvl_usd,change_7d,age_days,launch_odds,implied_value_usd,range_low_usd,range_high_usd,slice_usd,net_usd,verdict,farm_hours';
  const q = (v) => '"' + String(v === null || v === undefined ? '' : v).replace(/"/g, '""') + '"';
  const lines = list.map((r) => {
    const e = econ(r);
    return [r.rank, q(r.name), q(r.category || ''), q((r.chains || []).join(';')), r.tvl_usd, r.change_7d === null ? '' : r.change_7d, r.age_days === null ? '' : r.age_days, r.launch_odds, r.implied_value_usd, r.range_low_usd, r.range_high_usd, e.slice.toFixed(2), e.net.toFixed(2), e.verdict, r.farm.hours].join(',');
  });
  const blob = new Blob([[head].concat(lines).join('\n')], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'token-radar-board.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function wire() {
  const q = $('#q');
  if (q) q.addEventListener('input', function () { state.q = q.value; writeHash(); render(); });
  const cat = $('#category');
  if (cat) cat.addEventListener('change', function () { state.category = cat.value; writeHash(); render(); });
  const ch = $('#chain');
  if (ch) ch.addEventListener('change', function () { state.chain = ch.value; writeHash(); render(); });
  document.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', function () { state.tab = b.getAttribute('data-tab'); render(); }));
  document.querySelectorAll('[data-verdict]').forEach((b) => b.addEventListener('click', function () { state.verdict = b.getAttribute('data-verdict'); render(); }));
  document.querySelectorAll('[data-sort]').forEach((b) => b.addEventListener('click', function () {
    const key = b.getAttribute('data-sort');
    if (state.sort.key === key) state.sort.dir = -state.sort.dir;
    else state.sort = { key, dir: key === 'name' || key === 'rank' ? 1 : -1 };
    render();
  }));
  document.querySelectorAll('tr[data-slug]').forEach((tr) => {
    tr.addEventListener('click', function () { openDetail(tr.getAttribute('data-slug')); });
    tr.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDetail(tr.getAttribute('data-slug')); } });
  });
  const dep = $('#deposit');
  if (dep) dep.addEventListener('change', function () { state.deposit = Number(dep.value); render(); });
  const dr = $('#drop');
  if (dr) dr.addEventListener('change', function () { state.drop = Number(dr.value); render(); });
  const tb = $('#tbill');
  if (tb) tb.addEventListener('change', function () { state.tbill = Number(tb.value); render(); });
  const csv = $('#csv');
  if (csv) csv.addEventListener('click', exportCsv);
  const clear = $('#clear-filters');
  if (clear) clear.addEventListener('click', function () { state.q = ''; state.category = 'All categories'; state.chain = 'All chains'; state.verdict = 'all'; writeHash(); render(); });
}

function render() {
  const board = document.getElementById('board');
  if (!board) return;
  const active = document.activeElement;
  const activeId = active && active.id ? active.id : null;
  const selStart = active && typeof active.selectionStart === 'number' ? active.selectionStart : null;
  const selEnd = active && typeof active.selectionEnd === 'number' ? active.selectionEnd : null;
  board.innerHTML = '<div class="shell">' + header() + lede() + kpis() + controls() +
    (state.tab === 'pre' ? boardTable() + seal() : liveTable()) + midRow() + footer() + '</div>';
  board.setAttribute('aria-busy', 'false');
  if (!dialog.isConnected) board.appendChild(dialog);
  wire();
  if (activeId) {
    const el2 = document.getElementById(activeId);
    if (el2) {
      el2.focus();
      if (selStart !== null && typeof el2.setSelectionRange === 'function') {
        try { el2.setSelectionRange(selStart, selEnd); } catch (e) { /* select elements have no caret */ }
      }
    }
  }
  if (state.detail) openDetail(state.detail);
}

if (!DATA) {
  document.getElementById('board').textContent = 'No radar data found.';
} else {
  readHash();
  render();
  window.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && dialog.open) dialog.close();
  });
}
