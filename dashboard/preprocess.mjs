/**
 * Preprocess CSV dataset into optimized JSON for the dashboard.
 * Aggregates daily stats, computes per-advertiser metrics, trait analysis,
 * competitive benchmarks, and budget efficiency insights.
 */
import fs from 'fs';
import path from 'path';

const DATASET = path.resolve('../dataset');
const OUT = path.resolve('./public/data.json');

// ---- helpers ----
function parseCSV(filePath) {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const lines = raw.split('\n').filter(l => l.trim());
  const headers = lines[0].split(',');
  return lines.slice(1).map(line => {
    const values = [];
    let current = '';
    let inQuotes = false;
    for (const ch of line) {
      if (ch === '"') { inQuotes = !inQuotes; continue; }
      if (ch === ',' && !inQuotes) { values.push(current); current = ''; continue; }
      current += ch;
    }
    values.push(current);
    const obj = {};
    headers.forEach((h, i) => { obj[h.trim()] = (values[i] || '').trim(); });
    return obj;
  });
}

function toNum(v) { const n = parseFloat(v); return isNaN(n) ? 0 : n; }
function round(v, d = 4) { return Math.round(v * 10**d) / 10**d; }

// ---- load ----
console.log('Loading CSVs...');
const advertisers = parseCSV(path.join(DATASET, 'advertisers.csv'));
const campaigns = parseCSV(path.join(DATASET, 'campaigns.csv'));
const creatives = parseCSV(path.join(DATASET, 'creatives.csv'));
const creativeSummary = parseCSV(path.join(DATASET, 'creative_summary.csv'));
const campaignSummary = parseCSV(path.join(DATASET, 'campaign_summary.csv'));
const dailyStats = parseCSV(path.join(DATASET, 'creative_daily_country_os_stats.csv'));

console.log(`Loaded: ${advertisers.length} advertisers, ${campaigns.length} campaigns, ${creatives.length} creatives, ${creativeSummary.length} summaries, ${dailyStats.length} daily rows`);

// ---- Build creative detail objects ----
const creativeMap = {};
for (const c of creativeSummary) {
  const id = c.creative_id;
  creativeMap[id] = {
    id,
    campaign_id: c.campaign_id,
    advertiser: c.advertiser_name,
    app: c.app_name,
    vertical: c.vertical,
    format: c.format,
    status: c.creative_status,
    fatigue_day: c.fatigue_day ? toNum(c.fatigue_day) : null,
    days_active: toNum(c.total_days_active),
    spend: round(toNum(c.total_spend_usd), 2),
    impressions: toNum(c.total_impressions),
    clicks: toNum(c.total_clicks),
    conversions: toNum(c.total_conversions),
    revenue: round(toNum(c.total_revenue_usd), 2),
    ctr: round(toNum(c.overall_ctr)),
    cvr: round(toNum(c.overall_cvr)),
    ipm: round(toNum(c.overall_ipm)),
    roas: round(toNum(c.overall_roas)),
    first_7d_ctr: round(toNum(c.first_7d_ctr)),
    last_7d_ctr: round(toNum(c.last_7d_ctr)),
    ctr_decay: round(toNum(c.ctr_decay_pct)),
    first_7d_cvr: round(toNum(c.first_7d_cvr)),
    last_7d_cvr: round(toNum(c.last_7d_cvr)),
    cvr_decay: round(toNum(c.cvr_decay_pct)),
    perf_score: round(toNum(c.perf_score)),
    theme: c.theme,
    hook_type: c.hook_type,
    cta_text: c.cta_text,
    headline: c.headline,
    subhead: c.subhead,
    dominant_color: c.dominant_color,
    emotional_tone: c.emotional_tone,
    language: c.language,
    width: toNum(c.width),
    height: toNum(c.height),
    duration_sec: toNum(c.duration_sec),
    text_density: round(toNum(c.text_density)),
    copy_length: toNum(c.copy_length_chars),
    readability: round(toNum(c.readability_score)),
    brand_visibility: round(toNum(c.brand_visibility_score)),
    clutter: round(toNum(c.clutter_score)),
    novelty: round(toNum(c.novelty_score)),
    motion: round(toNum(c.motion_score)),
    faces_count: toNum(c.faces_count),
    product_count: toNum(c.product_count),
    has_price: toNum(c.has_price),
    has_discount: toNum(c.has_discount_badge),
    has_gameplay: toNum(c.has_gameplay),
    has_ugc_style: toNum(c.has_ugc_style),
    asset_file: c.asset_file,
    launch_date: c.creative_launch_date,
    peak_day_impressions: toNum(c.peak_day_impressions),
    first_7d_impressions: toNum(c.first_7d_impressions),
    last_7d_impressions: toNum(c.last_7d_impressions),
  };
}

// ---- Build daily time-series (aggregate by creative + day) ----
console.log('Aggregating daily time-series...');
const dailyByCreative = {};
for (const row of dailyStats) {
  const cid = row.creative_id;
  const day = toNum(row.days_since_launch);
  if (!dailyByCreative[cid]) dailyByCreative[cid] = {};
  if (!dailyByCreative[cid][day]) {
    dailyByCreative[cid][day] = { day, impressions: 0, clicks: 0, conversions: 0, spend: 0, revenue: 0 };
  }
  const d = dailyByCreative[cid][day];
  d.impressions += toNum(row.impressions);
  d.clicks += toNum(row.clicks);
  d.conversions += toNum(row.conversions);
  d.spend += toNum(row.spend_usd);
  d.revenue += toNum(row.revenue_usd);
}

const timeSeries = {};
for (const [cid, dayMap] of Object.entries(dailyByCreative)) {
  const arr = Object.values(dayMap).sort((a, b) => a.day - b.day);
  for (const d of arr) {
    d.ctr = d.impressions > 0 ? round(d.clicks / d.impressions) : 0;
    d.cvr = d.clicks > 0 ? round(d.conversions / d.clicks) : 0;
    d.cpi = d.conversions > 0 ? round(d.spend / d.conversions, 2) : 0;
  }
  timeSeries[cid] = arr;
}

// ---- Country & OS aggregations ----
console.log('Aggregating by country & OS...');
const countryPerf = {};
const osPerf = {};
// Also per-advertiser country/os breakdowns
const advCountryPerf = {};
const advOsPerf = {};
for (const row of dailyStats) {
  const country = row.country;
  const os = row.os;
  const creative = creativeMap[row.creative_id];
  const adv = creative?.advertiser || 'unknown';

  for (const [map, key] of [[countryPerf, country], [osPerf, os]]) {
    if (!map[key]) map[key] = { impressions: 0, clicks: 0, conversions: 0, spend: 0, revenue: 0 };
    map[key].impressions += toNum(row.impressions);
    map[key].clicks += toNum(row.clicks);
    map[key].conversions += toNum(row.conversions);
    map[key].spend += toNum(row.spend_usd);
    map[key].revenue += toNum(row.revenue_usd);
  }

  // Per-advertiser country
  if (!advCountryPerf[adv]) advCountryPerf[adv] = {};
  if (!advCountryPerf[adv][country]) advCountryPerf[adv][country] = { impressions: 0, clicks: 0, conversions: 0, spend: 0, revenue: 0 };
  advCountryPerf[adv][country].impressions += toNum(row.impressions);
  advCountryPerf[adv][country].clicks += toNum(row.clicks);
  advCountryPerf[adv][country].conversions += toNum(row.conversions);
  advCountryPerf[adv][country].spend += toNum(row.spend_usd);
  advCountryPerf[adv][country].revenue += toNum(row.revenue_usd);

  // Per-advertiser OS
  if (!advOsPerf[adv]) advOsPerf[adv] = {};
  if (!advOsPerf[adv][os]) advOsPerf[adv][os] = { impressions: 0, clicks: 0, conversions: 0, spend: 0, revenue: 0 };
  advOsPerf[adv][os].impressions += toNum(row.impressions);
  advOsPerf[adv][os].clicks += toNum(row.clicks);
  advOsPerf[adv][os].conversions += toNum(row.conversions);
  advOsPerf[adv][os].spend += toNum(row.spend_usd);
  advOsPerf[adv][os].revenue += toNum(row.revenue_usd);
}

function enrichPerf(map) {
  for (const c of Object.values(map)) {
    c.ctr = c.impressions > 0 ? round(c.clicks / c.impressions) : 0;
    c.cvr = c.clicks > 0 ? round(c.conversions / c.clicks) : 0;
    c.roas = c.spend > 0 ? round(c.revenue / c.spend) : 0;
    c.cpa = c.conversions > 0 ? round(c.spend / c.conversions, 2) : 0;
  }
}
enrichPerf(countryPerf);
enrichPerf(osPerf);
for (const m of Object.values(advCountryPerf)) enrichPerf(m);
for (const m of Object.values(advOsPerf)) enrichPerf(m);

// ---- Trait analysis (global + per-vertical) ----
console.log('Computing trait analysis...');
const traits = ['format', 'theme', 'hook_type', 'dominant_color', 'emotional_tone', 'language'];
const traitAnalysis = {};
const traitAnalysisByVertical = {};

for (const trait of traits) {
  // Global
  const groups = {};
  for (const c of Object.values(creativeMap)) {
    const val = c[trait] || 'unknown';
    if (!groups[val]) groups[val] = { perfs: [], ctrs: [], roass: [], count: 0 };
    groups[val].perfs.push(c.perf_score);
    groups[val].ctrs.push(c.ctr);
    groups[val].roass.push(c.roas);
    groups[val].count++;
  }
  traitAnalysis[trait] = Object.entries(groups).map(([val, g]) => ({
    value: val,
    count: g.count,
    avg_perf: round(g.perfs.reduce((a, b) => a + b, 0) / g.perfs.length),
    avg_ctr: round(g.ctrs.reduce((a, b) => a + b, 0) / g.ctrs.length),
    avg_roas: round(g.roass.reduce((a, b) => a + b, 0) / g.roass.length),
  })).sort((a, b) => b.avg_perf - a.avg_perf);

  // Per-vertical
  const vertGroups = {};
  for (const c of Object.values(creativeMap)) {
    const v = c.vertical;
    if (!vertGroups[v]) vertGroups[v] = {};
    const val = c[trait] || 'unknown';
    if (!vertGroups[v][val]) vertGroups[v][val] = { perfs: [], count: 0 };
    vertGroups[v][val].perfs.push(c.perf_score);
    vertGroups[v][val].count++;
  }
  traitAnalysisByVertical[trait] = {};
  for (const [v, gMap] of Object.entries(vertGroups)) {
    traitAnalysisByVertical[trait][v] = Object.entries(gMap).map(([val, g]) => ({
      value: val,
      count: g.count,
      avg_perf: round(g.perfs.reduce((a, b) => a + b, 0) / g.perfs.length),
    })).sort((a, b) => b.avg_perf - a.avg_perf);
  }
}

// ---- Per-advertiser insights ----
console.log('Computing per-advertiser insights...');
const advertiserInsights = {};
for (const adv of advertisers) {
  const name = adv.advertiser_name;
  const advCreatives = Object.values(creativeMap).filter(c => c.advertiser === name);
  const advCampaigns = campaignSummary.filter(c => c.advertiser_name === name);

  const totalSpend = advCreatives.reduce((s, c) => s + c.spend, 0);
  const totalRevenue = advCreatives.reduce((s, c) => s + c.revenue, 0);
  const totalImpressions = advCreatives.reduce((s, c) => s + c.impressions, 0);
  const totalClicks = advCreatives.reduce((s, c) => s + c.clicks, 0);
  const totalConversions = advCreatives.reduce((s, c) => s + c.conversions, 0);

  const statusBreakdown = { top_performer: 0, stable: 0, fatigued: 0, underperformer: 0 };
  advCreatives.forEach(c => { if (statusBreakdown[c.status] !== undefined) statusBreakdown[c.status]++; });

  // Best & worst creative
  const sorted = [...advCreatives].sort((a, b) => b.perf_score - a.perf_score);
  const bestCreative = sorted[0] || null;
  const worstCreative = sorted[sorted.length - 1] || null;

  // Budget efficiency: spend per conversion by campaign
  const campaignEfficiency = advCampaigns.map(c => ({
    id: c.campaign_id,
    app: c.app_name,
    spend: toNum(c.total_spend_usd),
    conversions: toNum(c.total_conversions),
    cpa: toNum(c.total_conversions) > 0 ? round(toNum(c.total_spend_usd) / toNum(c.total_conversions), 2) : 0,
    roas: round(toNum(c.overall_roas)),
    ctr: round(toNum(c.overall_ctr)),
  })).sort((a, b) => a.cpa - b.cpa);

  // Best performing traits for this advertiser
  const advTraits = {};
  for (const trait of traits) {
    const groups = {};
    for (const c of advCreatives) {
      const val = c[trait] || 'unknown';
      if (!groups[val]) groups[val] = { perfs: [], count: 0 };
      groups[val].perfs.push(c.perf_score);
      groups[val].count++;
    }
    advTraits[trait] = Object.entries(groups)
      .map(([val, g]) => ({
        value: val,
        count: g.count,
        avg_perf: round(g.perfs.reduce((a, b) => a + b, 0) / g.perfs.length),
      }))
      .sort((a, b) => b.avg_perf - a.avg_perf);
  }

  // Format performance breakdown
  const formatPerf = {};
  for (const c of advCreatives) {
    if (!formatPerf[c.format]) formatPerf[c.format] = { spend: 0, revenue: 0, impressions: 0, clicks: 0, conversions: 0, count: 0 };
    formatPerf[c.format].spend += c.spend;
    formatPerf[c.format].revenue += c.revenue;
    formatPerf[c.format].impressions += c.impressions;
    formatPerf[c.format].clicks += c.clicks;
    formatPerf[c.format].conversions += c.conversions;
    formatPerf[c.format].count++;
  }
  for (const f of Object.values(formatPerf)) {
    f.ctr = f.impressions > 0 ? round(f.clicks / f.impressions) : 0;
    f.cvr = f.clicks > 0 ? round(f.conversions / f.clicks) : 0;
    f.roas = f.spend > 0 ? round(f.revenue / f.spend) : 0;
    f.cpa = f.conversions > 0 ? round(f.spend / f.conversions, 2) : 0;
  }

  // Wasted spend: sum of spend on underperformers
  const wastedSpend = advCreatives.filter(c => c.status === 'underperformer').reduce((s, c) => s + c.spend, 0);
  const fatiguedSpendAtRisk = advCreatives.filter(c => c.status === 'fatigued').reduce((s, c) => s + c.spend, 0);

  // Creative diversity score (unique combos of format + theme)
  const combos = new Set(advCreatives.map(c => `${c.format}|${c.theme}`));
  const maxCombos = 5 * 6; // 5 formats * ~6 themes
  const diversityScore = round(combos.size / maxCombos);

  advertiserInsights[name] = {
    name,
    vertical: adv.vertical,
    region: adv.hq_region,
    totalCreatives: advCreatives.length,
    totalCampaigns: advCampaigns.length,
    totalSpend: round(totalSpend, 2),
    totalRevenue: round(totalRevenue, 2),
    totalImpressions,
    totalClicks,
    totalConversions,
    roas: totalSpend > 0 ? round(totalRevenue / totalSpend) : 0,
    ctr: totalImpressions > 0 ? round(totalClicks / totalImpressions) : 0,
    cvr: totalClicks > 0 ? round(totalConversions / totalClicks) : 0,
    cpa: totalConversions > 0 ? round(totalSpend / totalConversions, 2) : 0,
    statusBreakdown,
    bestCreativeId: bestCreative?.id || null,
    worstCreativeId: worstCreative?.id || null,
    campaignEfficiency,
    advTraits,
    formatPerf,
    wastedSpend: round(wastedSpend, 2),
    fatiguedSpendAtRisk: round(fatiguedSpendAtRisk, 2),
    diversityScore,
    countryPerf: advCountryPerf[name] || {},
    osPerf: advOsPerf[name] || {},
  };
}

// ---- Vertical benchmarks (so each advertiser can compare to their vertical avg) ----
console.log('Computing vertical benchmarks...');
const verticalBenchmarks = {};
for (const adv of Object.values(advertiserInsights)) {
  const v = adv.vertical;
  if (!verticalBenchmarks[v]) verticalBenchmarks[v] = { ctrs: [], cvrs: [], roass: [], cpas: [], spends: [] };
  verticalBenchmarks[v].ctrs.push(adv.ctr);
  verticalBenchmarks[v].cvrs.push(adv.cvr);
  verticalBenchmarks[v].roass.push(adv.roas);
  verticalBenchmarks[v].cpas.push(adv.cpa);
  verticalBenchmarks[v].spends.push(adv.totalSpend);
}
for (const [v, b] of Object.entries(verticalBenchmarks)) {
  const avg = arr => arr.length > 0 ? round(arr.reduce((a, c) => a + c, 0) / arr.length) : 0;
  verticalBenchmarks[v] = {
    avg_ctr: avg(b.ctrs),
    avg_cvr: avg(b.cvrs),
    avg_roas: avg(b.roass),
    avg_cpa: avg(b.cpas),
    avg_spend: avg(b.spends),
    count: b.ctrs.length,
  };
}

// ---- Legacy Clusters (vertical × format groupby, kept for backward compat) ----
console.log('Building legacy clusters...');
const clusters = {};
for (const c of Object.values(creativeMap)) {
  const key = `${c.vertical}|${c.format}`;
  if (!clusters[key]) clusters[key] = { vertical: c.vertical, format: c.format, creatives: [] };
  clusters[key].creatives.push(c.id);
}

// ============================================================
// ---- ML Clustering (K-Means with real feature vectors) ----
// ============================================================
console.log('Running ML clustering...');

// --- Helpers ---
function zScoreNormalize(arr) {
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  const std = Math.sqrt(arr.reduce((s, v) => s + (v - mean) ** 2, 0) / arr.length);
  return { values: arr.map(v => std === 0 ? 0 : (v - mean) / std), mean, std };
}

function euclidean(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += (a[i] - b[i]) ** 2;
  return Math.sqrt(sum);
}

function kMeansPlusPlusInit(data, k) {
  const n = data.length;
  const centroids = [data[Math.floor(Math.random() * n)].slice()];
  for (let c = 1; c < k; c++) {
    const dists = data.map(p => Math.min(...centroids.map(cen => euclidean(p, cen))));
    const total = dists.reduce((a, b) => a + b * b, 0);
    let r = Math.random() * total;
    for (let i = 0; i < n; i++) {
      r -= dists[i] * dists[i];
      if (r <= 0) { centroids.push(data[i].slice()); break; }
      if (i === n - 1) centroids.push(data[i].slice());
    }
  }
  return centroids;
}

function kMeans(data, k, maxIter = 100) {
  const dim = data[0].length;
  let centroids = kMeansPlusPlusInit(data, k);
  let assignments = new Array(data.length).fill(0);

  for (let iter = 0; iter < maxIter; iter++) {
    // Assign
    let changed = false;
    for (let i = 0; i < data.length; i++) {
      let minD = Infinity, minC = 0;
      for (let c = 0; c < k; c++) {
        const d = euclidean(data[i], centroids[c]);
        if (d < minD) { minD = d; minC = c; }
      }
      if (assignments[i] !== minC) { assignments[i] = minC; changed = true; }
    }
    if (!changed) break;

    // Recompute centroids
    const sums = Array.from({ length: k }, () => new Array(dim).fill(0));
    const counts = new Array(k).fill(0);
    for (let i = 0; i < data.length; i++) {
      const c = assignments[i];
      counts[c]++;
      for (let d = 0; d < dim; d++) sums[c][d] += data[i][d];
    }
    for (let c = 0; c < k; c++) {
      if (counts[c] === 0) continue;
      for (let d = 0; d < dim; d++) centroids[c][d] = sums[c][d] / counts[c];
    }
  }

  // Inertia
  let inertia = 0;
  for (let i = 0; i < data.length; i++) {
    inertia += euclidean(data[i], centroids[assignments[i]]) ** 2;
  }

  return { centroids, assignments, inertia };
}

function silhouetteScore(data, assignments, k) {
  const n = data.length;
  if (n < 2 || k < 2) return 0;

  // Pre-group indices by cluster
  const clusterIndices = Array.from({ length: k }, () => []);
  for (let i = 0; i < n; i++) clusterIndices[assignments[i]].push(i);

  let totalScore = 0;
  for (let i = 0; i < n; i++) {
    const ci = assignments[i];
    const myCluster = clusterIndices[ci];
    if (myCluster.length <= 1) continue;

    // a(i): avg intra-cluster distance
    let a = 0;
    for (const j of myCluster) { if (j !== i) a += euclidean(data[i], data[j]); }
    a /= (myCluster.length - 1);

    // b(i): min avg distance to any other cluster
    let b = Infinity;
    for (let c = 0; c < k; c++) {
      if (c === ci || clusterIndices[c].length === 0) continue;
      let avgD = 0;
      for (const j of clusterIndices[c]) avgD += euclidean(data[i], data[j]);
      avgD /= clusterIndices[c].length;
      if (avgD < b) b = avgD;
    }

    totalScore += (b - a) / Math.max(a, b);
  }
  return round(totalScore / n);
}

function findOptimalK(data, kMin = 3, kMax = 8) {
  let bestK = kMin, bestSil = -1;
  const results = [];
  for (let k = kMin; k <= Math.min(kMax, data.length - 1); k++) {
    const res = kMeans(data, k);
    const sil = silhouetteScore(data, res.assignments, k);
    results.push({ k, inertia: round(res.inertia, 2), silhouette: sil });
    if (sil > bestSil) { bestSil = sil; bestK = k; }
  }
  return { bestK, results };
}

// Simple PCA: project to 2D using power iteration for top 2 eigenvectors of covariance matrix
function pcaProject2D(data) {
  const n = data.length;
  const dim = data[0].length;

  // Center data
  const means = new Array(dim).fill(0);
  for (const row of data) for (let d = 0; d < dim; d++) means[d] += row[d];
  for (let d = 0; d < dim; d++) means[d] /= n;
  const centered = data.map(row => row.map((v, d) => v - means[d]));

  // Covariance matrix
  const cov = Array.from({ length: dim }, () => new Array(dim).fill(0));
  for (const row of centered) {
    for (let i = 0; i < dim; i++) {
      for (let j = i; j < dim; j++) {
        cov[i][j] += row[i] * row[j];
        if (i !== j) cov[j][i] += row[i] * row[j];
      }
    }
  }
  for (let i = 0; i < dim; i++) for (let j = 0; j < dim; j++) cov[i][j] /= n;

  // Power iteration for top eigenvector
  function powerIteration(matrix, deflatedBy = null) {
    let vec = Array.from({ length: dim }, () => Math.random() - 0.5);
    const mat = deflatedBy ? matrix.map((row, i) => row.map((v, j) =>
      v - deflatedBy[i] * deflatedBy[j] * (deflatedBy.reduce((s, x, k) => s + x * matrix[k].reduce((ss, y, l) => ss + y * deflatedBy[l], 0), 0))
    )) : matrix;

    // Deflate properly if needed
    let useMat = matrix;
    if (deflatedBy) {
      // Compute eigenvalue of deflatedBy
      let mv = new Array(dim).fill(0);
      for (let i = 0; i < dim; i++) for (let j = 0; j < dim; j++) mv[i] += matrix[i][j] * deflatedBy[j];
      const eigenval = deflatedBy.reduce((s, v, i) => s + v * mv[i], 0);
      useMat = matrix.map((row, i) => row.map((v, j) => v - eigenval * deflatedBy[i] * deflatedBy[j]));
    }

    for (let iter = 0; iter < 100; iter++) {
      const newVec = new Array(dim).fill(0);
      for (let i = 0; i < dim; i++) for (let j = 0; j < dim; j++) newVec[i] += useMat[i][j] * vec[j];
      const norm = Math.sqrt(newVec.reduce((s, v) => s + v * v, 0));
      if (norm === 0) return vec;
      vec = newVec.map(v => v / norm);
    }
    return vec;
  }

  const pc1 = powerIteration(cov);
  const pc2 = powerIteration(cov, pc1);

  // Project
  return centered.map(row => ({
    x: round(row.reduce((s, v, i) => s + v * pc1[i], 0), 4),
    y: round(row.reduce((s, v, i) => s + v * pc2[i], 0), 4),
  }));
}

// --- Feature extraction ---
const allCrs = Object.values(creativeMap);
const ids = allCrs.map(c => c.id);

// Define feature sets
const PERF_FEATURES = ['ctr', 'cvr', 'roas', 'ctr_decay', 'cvr_decay', 'perf_score'];
const VISUAL_FEATURES = [
  'text_density', 'readability', 'brand_visibility', 'clutter',
  'novelty', 'motion', 'duration_sec', 'faces_count', 'product_count',
  'has_price', 'has_discount', 'has_gameplay', 'has_ugc_style',
];
const COMBINED_FEATURES = [...PERF_FEATURES, ...VISUAL_FEATURES];

// Feature labels for interpretation
const FEATURE_LABELS = {
  ctr: 'CTR', cvr: 'CVR', roas: 'ROAS', ctr_decay: 'CTR Decay', cvr_decay: 'CVR Decay',
  perf_score: 'Perf Score', text_density: 'Text Density', readability: 'Readability',
  brand_visibility: 'Brand Visibility', clutter: 'Clutter', novelty: 'Novelty',
  motion: 'Motion', duration_sec: 'Duration', faces_count: 'Faces', product_count: 'Products',
  has_price: 'Shows Price', has_discount: 'Discount Badge', has_gameplay: 'Gameplay',
  has_ugc_style: 'UGC Style',
};

function extractAndNormalize(featureNames) {
  const rawCols = featureNames.map(f => allCrs.map(c => c[f] || 0));
  const normCols = rawCols.map(col => zScoreNormalize(col));
  // Clip to ±3σ
  const clipped = normCols.map(col => ({
    ...col,
    values: col.values.map(v => Math.max(-3, Math.min(3, v)))
  }));
  // Build row vectors
  const vectors = allCrs.map((_, i) => clipped.map(col => col.values[i]));
  return { vectors, normStats: clipped.map((c, i) => ({ feature: featureNames[i], mean: round(c.mean, 4), std: round(c.std, 4) })) };
}

function autoLabel(centroid, featureNames, normStats) {
  // Find the 2-3 features where centroid value is most extreme (positive = high, negative = low)
  const scored = centroid.map((v, i) => ({ feature: featureNames[i], z: v, label: FEATURE_LABELS[featureNames[i]] || featureNames[i] }));
  scored.sort((a, b) => Math.abs(b.z) - Math.abs(a.z));
  const top = scored.slice(0, 3);
  const parts = top.map(t => `${t.z > 0 ? 'High' : 'Low'} ${t.label}`);
  return parts.join(', ');
}

function findNearestNeighbors(vectors, idx, k = 5) {
  const dists = vectors
    .map((v, i) => ({ i, d: i === idx ? Infinity : euclidean(vectors[idx], v) }))
    .sort((a, b) => a.d - b.d);
  return dists.slice(0, k).map(d => ({ id: ids[d.i], distance: round(d.d, 4) }));
}

function runClusteringModel(featureNames, modelName) {
  console.log(`  Clustering model: ${modelName} (${featureNames.length} features)`);
  const { vectors, normStats } = extractAndNormalize(featureNames);

  // Find optimal K
  const { bestK, results: elbowResults } = findOptimalK(vectors, 3, 8);
  console.log(`    Optimal K = ${bestK}`);

  // Run final K-Means with best K
  // Run 5 times and pick best (lowest inertia) to mitigate random init variance
  let bestRun = null;
  for (let run = 0; run < 5; run++) {
    const res = kMeans(vectors, bestK);
    if (!bestRun || res.inertia < bestRun.inertia) bestRun = res;
  }

  const sil = silhouetteScore(vectors, bestRun.assignments, bestK);
  console.log(`    Silhouette = ${sil}`);

  // PCA 2D projection
  const pca2d = pcaProject2D(vectors);

  // Build cluster details
  const clusterDetails = [];
  for (let c = 0; c < bestK; c++) {
    const memberIndices = [];
    for (let i = 0; i < ids.length; i++) { if (bestRun.assignments[i] === c) memberIndices.push(i); }

    const memberCreatives = memberIndices.map(i => allCrs[i]);
    const avgPerf = memberCreatives.reduce((s, cr) => s + cr.perf_score, 0) / memberCreatives.length;
    const avgCtr = memberCreatives.reduce((s, cr) => s + cr.ctr, 0) / memberCreatives.length;
    const avgRoas = memberCreatives.reduce((s, cr) => s + cr.roas, 0) / memberCreatives.length;
    const totalSpend = memberCreatives.reduce((s, cr) => s + cr.spend, 0);
    const totalRevenue = memberCreatives.reduce((s, cr) => s + cr.revenue, 0);

    const statusBreakdown = { top_performer: 0, stable: 0, fatigued: 0, underperformer: 0 };
    memberCreatives.forEach(cr => { if (statusBreakdown[cr.status] !== undefined) statusBreakdown[cr.status]++; });

    // Centroid as readable object
    const centroidObj = {};
    featureNames.forEach((f, i) => { centroidObj[f] = round(bestRun.centroids[c][i], 3); });

    // Dominant categorical traits
    const dominantTraits = {};
    for (const trait of ['format', 'theme', 'hook_type', 'dominant_color', 'emotional_tone', 'vertical']) {
      const counts = {};
      memberCreatives.forEach(cr => { const v = cr[trait] || 'unknown'; counts[v] = (counts[v] || 0) + 1; });
      const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
      dominantTraits[trait] = sorted[0]?.[0] || 'unknown';
    }

    clusterDetails.push({
      id: c,
      label: autoLabel(bestRun.centroids[c], featureNames, normStats),
      size: memberCreatives.length,
      avgPerf: round(avgPerf, 4),
      avgCtr: round(avgCtr, 6),
      avgRoas: round(avgRoas, 4),
      totalSpend: round(totalSpend, 2),
      totalRevenue: round(totalRevenue, 2),
      statusBreakdown,
      centroid: centroidObj,
      dominantTraits,
      creativeIds: memberCreatives.map(cr => cr.id),
    });
  }

  // Sort clusters by avgPerf descending
  clusterDetails.sort((a, b) => b.avgPerf - a.avgPerf);
  // Remap IDs after sort
  const idRemap = {};
  clusterDetails.forEach((cl, newId) => { idRemap[cl.id] = newId; cl.id = newId; });

  // Per-creative assignments and PCA coordinates
  const creativeAssignments = {};
  for (let i = 0; i < ids.length; i++) {
    creativeAssignments[ids[i]] = {
      cluster: idRemap[bestRun.assignments[i]],
      pca: pca2d[i],
    };
  }

  // Nearest neighbors (top 5) per creative
  const nearestNeighbors = {};
  for (let i = 0; i < ids.length; i++) {
    nearestNeighbors[ids[i]] = findNearestNeighbors(vectors, i, 5);
  }

  return {
    k: bestK,
    silhouette: sil,
    features: featureNames.map(f => FEATURE_LABELS[f] || f),
    featureKeys: featureNames,
    elbow: elbowResults,
    clusters: clusterDetails,
    assignments: creativeAssignments,
    nearestNeighbors,
  };
}

// Run all three models
const mlClusters = {
  combined: runClusteringModel(COMBINED_FEATURES, 'Combined'),
  performance: runClusteringModel(PERF_FEATURES, 'Performance'),
  visual: runClusteringModel(VISUAL_FEATURES, 'Visual DNA'),
};

// Attach cluster assignments to each creative
for (const c of allCrs) {
  c.cluster_combined = mlClusters.combined.assignments[c.id]?.cluster;
  c.cluster_performance = mlClusters.performance.assignments[c.id]?.cluster;
  c.cluster_visual = mlClusters.visual.assignments[c.id]?.cluster;
  c.pca_combined = mlClusters.combined.assignments[c.id]?.pca;
  c.nearest_neighbors = mlClusters.combined.nearestNeighbors[c.id] || [];
}

console.log(`ML Clustering done: combined(k=${mlClusters.combined.k}, sil=${mlClusters.combined.silhouette}), perf(k=${mlClusters.performance.k}, sil=${mlClusters.performance.silhouette}), visual(k=${mlClusters.visual.k}, sil=${mlClusters.visual.silhouette})`);

// ---- Campaign detail ----
const campaignMap = {};
for (const c of campaignSummary) {
  campaignMap[c.campaign_id] = {
    id: c.campaign_id,
    advertiser_id: c.advertiser_id,
    advertiser: c.advertiser_name,
    app: c.app_name,
    vertical: c.vertical,
    objective: c.objective,
    theme: c.primary_theme,
    target_age: c.target_age_segment,
    target_os: c.target_os,
    countries: c.countries,
    start_date: c.start_date,
    end_date: c.end_date,
    budget: toNum(c.daily_budget_usd),
    kpi: c.kpi_goal,
    spend: round(toNum(c.total_spend_usd), 2),
    impressions: toNum(c.total_impressions),
    clicks: toNum(c.total_clicks),
    conversions: toNum(c.total_conversions),
    revenue: round(toNum(c.total_revenue_usd), 2),
    ctr: round(toNum(c.overall_ctr)),
    cvr: round(toNum(c.overall_cvr)),
    roas: round(toNum(c.overall_roas)),
  };
}

// ---- Global stats ----
const allCreatives = Object.values(creativeMap);
const globalStats = {
  totalCreatives: allCreatives.length,
  totalCampaigns: campaigns.length,
  totalAdvertisers: advertisers.length,
  totalSpend: round(allCreatives.reduce((s, c) => s + c.spend, 0), 2),
  totalImpressions: allCreatives.reduce((s, c) => s + c.impressions, 0),
  totalConversions: allCreatives.reduce((s, c) => s + c.conversions, 0),
  totalRevenue: round(allCreatives.reduce((s, c) => s + c.revenue, 0), 2),
  statusBreakdown: {
    top_performer: allCreatives.filter(c => c.status === 'top_performer').length,
    stable: allCreatives.filter(c => c.status === 'stable').length,
    fatigued: allCreatives.filter(c => c.status === 'fatigued').length,
    underperformer: allCreatives.filter(c => c.status === 'underperformer').length,
  }
};

// ---- Output ----
const output = {
  advertisers: advertisers.map(a => ({
    id: a.advertiser_id,
    name: a.advertiser_name,
    vertical: a.vertical,
    region: a.hq_region,
  })),
  campaigns: Object.values(campaignMap),
  creatives: allCreatives,
  timeSeries,
  countryPerf,
  osPerf,
  traitAnalysis,
  traitAnalysisByVertical,
  clusters: Object.values(clusters),
  mlClusters,
  stats: globalStats,
  advertiserInsights,
  verticalBenchmarks,
};

fs.writeFileSync(OUT, JSON.stringify(output));
const sizeMB = (fs.statSync(OUT).size / 1024 / 1024).toFixed(2);
console.log(`Written ${OUT} (${sizeMB} MB)`);
