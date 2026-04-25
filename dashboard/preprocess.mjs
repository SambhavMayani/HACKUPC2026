/**
 * Preprocess CSV dataset into optimized JSON for the dashboard.
 * We aggregate the large daily stats file into manageable time-series,
 * and merge metadata from all CSVs into a single data.json.
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
    // Handle commas inside quoted fields
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

// ---- load ----
console.log('Loading CSVs...');
const advertisers = parseCSV(path.join(DATASET, 'advertisers.csv'));
const campaigns = parseCSV(path.join(DATASET, 'campaigns.csv'));
const creatives = parseCSV(path.join(DATASET, 'creatives.csv'));
const creativeSummary = parseCSV(path.join(DATASET, 'creative_summary.csv'));
const campaignSummary = parseCSV(path.join(DATASET, 'campaign_summary.csv'));
const dailyStats = parseCSV(path.join(DATASET, 'creative_daily_country_os_stats.csv'));

console.log(`Loaded: ${advertisers.length} advertisers, ${campaigns.length} campaigns, ${creatives.length} creatives, ${creativeSummary.length} creative summaries, ${dailyStats.length} daily rows`);

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
    spend: toNum(c.total_spend_usd),
    impressions: toNum(c.total_impressions),
    clicks: toNum(c.total_clicks),
    conversions: toNum(c.total_conversions),
    revenue: toNum(c.total_revenue_usd),
    ctr: toNum(c.overall_ctr),
    cvr: toNum(c.overall_cvr),
    ipm: toNum(c.overall_ipm),
    roas: toNum(c.overall_roas),
    first_7d_ctr: toNum(c.first_7d_ctr),
    last_7d_ctr: toNum(c.last_7d_ctr),
    ctr_decay: toNum(c.ctr_decay_pct),
    first_7d_cvr: toNum(c.first_7d_cvr),
    last_7d_cvr: toNum(c.last_7d_cvr),
    cvr_decay: toNum(c.cvr_decay_pct),
    perf_score: toNum(c.perf_score),
    // creative attributes
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
    text_density: toNum(c.text_density),
    copy_length: toNum(c.copy_length_chars),
    readability: toNum(c.readability_score),
    brand_visibility: toNum(c.brand_visibility_score),
    clutter: toNum(c.clutter_score),
    novelty: toNum(c.novelty_score),
    motion: toNum(c.motion_score),
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

// Convert to sorted arrays and compute rolling CTR/CVR
const timeSeries = {};
for (const [cid, dayMap] of Object.entries(dailyByCreative)) {
  const arr = Object.values(dayMap).sort((a, b) => a.day - b.day);
  // Compute daily CTR and CVR
  for (const d of arr) {
    d.ctr = d.impressions > 0 ? d.clicks / d.impressions : 0;
    d.cvr = d.clicks > 0 ? d.conversions / d.clicks : 0;
    d.cpi = d.conversions > 0 ? d.spend / d.conversions : 0;
  }
  timeSeries[cid] = arr;
}

// ---- Build country-level aggregations ----
console.log('Aggregating by country...');
const countryPerf = {};
for (const row of dailyStats) {
  const country = row.country;
  if (!countryPerf[country]) countryPerf[country] = { impressions: 0, clicks: 0, conversions: 0, spend: 0, revenue: 0 };
  countryPerf[country].impressions += toNum(row.impressions);
  countryPerf[country].clicks += toNum(row.clicks);
  countryPerf[country].conversions += toNum(row.conversions);
  countryPerf[country].spend += toNum(row.spend_usd);
  countryPerf[country].revenue += toNum(row.revenue_usd);
}
for (const c of Object.values(countryPerf)) {
  c.ctr = c.impressions > 0 ? c.clicks / c.impressions : 0;
  c.cvr = c.clicks > 0 ? c.conversions / c.clicks : 0;
  c.roas = c.spend > 0 ? c.revenue / c.spend : 0;
}

// ---- Build OS-level aggregations ----
const osPerf = {};
for (const row of dailyStats) {
  const os = row.os;
  if (!osPerf[os]) osPerf[os] = { impressions: 0, clicks: 0, conversions: 0, spend: 0, revenue: 0 };
  osPerf[os].impressions += toNum(row.impressions);
  osPerf[os].clicks += toNum(row.clicks);
  osPerf[os].conversions += toNum(row.conversions);
  osPerf[os].spend += toNum(row.spend_usd);
  osPerf[os].revenue += toNum(row.revenue_usd);
}
for (const o of Object.values(osPerf)) {
  o.ctr = o.impressions > 0 ? o.clicks / o.impressions : 0;
  o.cvr = o.clicks > 0 ? o.conversions / o.clicks : 0;
  o.roas = o.spend > 0 ? o.revenue / o.spend : 0;
}

// ---- Compute feature importance / trait analysis ----
console.log('Computing trait analysis...');
const traits = ['format', 'theme', 'hook_type', 'dominant_color', 'emotional_tone', 'language'];
const traitAnalysis = {};
for (const trait of traits) {
  const groups = {};
  for (const c of Object.values(creativeMap)) {
    const val = c[trait] || 'unknown';
    if (!groups[val]) groups[val] = { values: [], count: 0 };
    groups[val].values.push(c.perf_score);
    groups[val].count++;
  }
  traitAnalysis[trait] = Object.entries(groups).map(([val, g]) => ({
    value: val,
    count: g.count,
    avg_perf: g.values.reduce((a, b) => a + b, 0) / g.values.length,
    avg_ctr: 0, // will be computed below
  })).sort((a, b) => b.avg_perf - a.avg_perf);
}

// Enrich trait analysis with avg CTR
for (const trait of traits) {
  const groups = {};
  for (const c of Object.values(creativeMap)) {
    const val = c[trait] || 'unknown';
    if (!groups[val]) groups[val] = [];
    groups[val].push(c.ctr);
  }
  for (const entry of traitAnalysis[trait]) {
    const ctrs = groups[entry.value] || [];
    entry.avg_ctr = ctrs.length > 0 ? ctrs.reduce((a, b) => a + b, 0) / ctrs.length : 0;
  }
}

// ---- Clustering: group by vertical + format + emotional_tone ----
console.log('Building clusters...');
const clusters = {};
for (const c of Object.values(creativeMap)) {
  const key = `${c.vertical}|${c.format}`;
  if (!clusters[key]) clusters[key] = { vertical: c.vertical, format: c.format, creatives: [] };
  clusters[key].creatives.push(c.id);
}

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
    spend: toNum(c.total_spend_usd),
    impressions: toNum(c.total_impressions),
    clicks: toNum(c.total_clicks),
    conversions: toNum(c.total_conversions),
    revenue: toNum(c.total_revenue_usd),
    ctr: toNum(c.overall_ctr),
    cvr: toNum(c.overall_cvr),
    roas: toNum(c.overall_roas),
  };
}

// ---- Output ----
const output = {
  advertisers: advertisers.map(a => ({
    id: a.advertiser_id,
    name: a.advertiser_name,
    vertical: a.vertical,
    region: a.hq_region,
  })),
  campaigns: Object.values(campaignMap),
  creatives: Object.values(creativeMap),
  timeSeries,
  countryPerf,
  osPerf,
  traitAnalysis,
  clusters: Object.values(clusters),
  stats: {
    totalCreatives: Object.keys(creativeMap).length,
    totalCampaigns: campaigns.length,
    totalAdvertisers: advertisers.length,
    totalSpend: Object.values(creativeMap).reduce((s, c) => s + c.spend, 0),
    totalImpressions: Object.values(creativeMap).reduce((s, c) => s + c.impressions, 0),
    totalConversions: Object.values(creativeMap).reduce((s, c) => s + c.conversions, 0),
    totalRevenue: Object.values(creativeMap).reduce((s, c) => s + c.revenue, 0),
    statusBreakdown: {
      top_performer: Object.values(creativeMap).filter(c => c.status === 'top_performer').length,
      stable: Object.values(creativeMap).filter(c => c.status === 'stable').length,
      fatigued: Object.values(creativeMap).filter(c => c.status === 'fatigued').length,
      underperformer: Object.values(creativeMap).filter(c => c.status === 'underperformer').length,
    }
  }
};

fs.writeFileSync(OUT, JSON.stringify(output));
const sizeMB = (fs.statSync(OUT).size / 1024 / 1024).toFixed(2);
console.log(`Written ${OUT} (${sizeMB} MB)`);
