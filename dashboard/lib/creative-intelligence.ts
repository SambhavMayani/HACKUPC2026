import { readFile } from "node:fs/promises";
import path from "node:path";
import Papa from "papaparse";

const datasetDir = path.join(process.cwd(), "Smadex_Creative_Intelligence_Dataset_FULL");

type CreativeSummaryRow = Record<string, string>;
type CampaignRow = Record<string, string>;
type AdvertiserRow = Record<string, string>;
type DailyRow = Record<string, string>;

export type Creative = {
  creativeId: string;
  campaignId: string;
  campaignLabel: string;
  advertiser: string;
  appName: string;
  vertical: string;
  format: string;
  status: string;
  fatigueDay: number | null;
  totalDaysActive: number;
  totalSpendUsd: number;
  totalImpressions: number;
  totalClicks: number;
  totalConversions: number;
  totalRevenueUsd: number;
  overallCtr: number;
  overallCvr: number;
  overallIpm: number;
  overallRoas: number;
  first7dCtr: number;
  last7dCtr: number;
  ctrDecayPct: number;
  first7dCvr: number;
  last7dCvr: number;
  cvrDecayPct: number;
  perfScore: number;
  width: number;
  height: number;
  language: string;
  launchDate: string;
  theme: string;
  hookType: string;
  ctaText: string;
  headline: string;
  subhead: string;
  dominantColor: string;
  emotionalTone: string;
  durationSec: number;
  textDensity: number;
  copyLengthChars: number;
  readabilityScore: number;
  brandVisibilityScore: number;
  clutterScore: number;
  noveltyScore: number;
  motionScore: number;
  facesCount: number;
  productCount: number;
  hasPrice: boolean;
  hasDiscountBadge: boolean;
  hasGameplay: boolean;
  hasUgcStyle: boolean;
  assetFile: string;
  segmentMetrics: Record<string, SegmentMetrics>;
  sparkline: number[];
};

export type SegmentMetrics = {
  spendUsd: number;
  impressions: number;
  clicks: number;
  conversions: number;
  revenueUsd: number;
  ctr: number;
  cvr: number;
  ipm: number;
  roas: number;
};

export type DashboardData = {
  datasetStats: {
    advertisers: number;
    campaigns: number;
    creatives: number;
    dailyRows: number;
    dateRange: string;
  };
  filters: {
    advertisers: string[];
    campaigns: Array<{ id: string; label: string; advertiser: string; vertical: string }>;
    countries: string[];
    oses: string[];
    formats: string[];
    verticals: string[];
  };
  creatives: Creative[];
};

let cachedData: Promise<DashboardData> | null = null;

function parseNumber(value: string | undefined) {
  if (!value) {
    return 0;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function parseBool(value: string | undefined) {
  return value === "1";
}

async function readCsv<T>(fileName: string) {
  const csv = await readFile(path.join(datasetDir, fileName), "utf8");
  return Papa.parse<T>(csv, { header: true, skipEmptyLines: true }).data;
}

function uniqueSorted(values: Iterable<string>) {
  return [...new Set([...values].filter(Boolean))].sort((left, right) => left.localeCompare(right));
}

function emptyMetrics(): SegmentMetrics {
  return {
    spendUsd: 0,
    impressions: 0,
    clicks: 0,
    conversions: 0,
    revenueUsd: 0,
    ctr: 0,
    cvr: 0,
    ipm: 0,
    roas: 0,
  };
}

function finalizeMetrics(metrics: SegmentMetrics) {
  metrics.ctr = metrics.clicks / Math.max(metrics.impressions, 1);
  metrics.cvr = metrics.conversions / Math.max(metrics.clicks, 1);
  metrics.ipm = (metrics.conversions / Math.max(metrics.impressions, 1)) * 1000;
  metrics.roas = metrics.revenueUsd / Math.max(metrics.spendUsd, 1);
  return metrics;
}

function addToMetrics(metrics: SegmentMetrics, row: DailyRow) {
  metrics.spendUsd += parseNumber(row.spend_usd);
  metrics.impressions += parseNumber(row.impressions);
  metrics.clicks += parseNumber(row.clicks);
  metrics.conversions += parseNumber(row.conversions);
  metrics.revenueUsd += parseNumber(row.revenue_usd);
}

function segmentKey(country: string, os: string) {
  return `${country || "All"}::${os || "All"}`;
}

function compactSparkline(values: number[], buckets = 14) {
  if (values.length === 0) {
    return [];
  }

  if (values.length <= buckets) {
    return values.map((value) => Number(value.toFixed(5)));
  }

  const result: number[] = [];
  for (let index = 0; index < buckets; index += 1) {
    const start = Math.floor((index * values.length) / buckets);
    const end = Math.max(start + 1, Math.floor(((index + 1) * values.length) / buckets));
    const bucket = values.slice(start, end);
    const average = bucket.reduce((sum, value) => sum + value, 0) / bucket.length;
    result.push(Number(average.toFixed(5)));
  }
  return result;
}

function makeCampaignLabel(row: CampaignRow) {
  return `${row.campaign_id} - ${row.app_name}`;
}

export async function getDashboardData(): Promise<DashboardData> {
  if (!cachedData) {
    cachedData = (async () => {
      const [creativeRows, dailyRows, campaignRows, advertiserRows] = await Promise.all([
        readCsv<CreativeSummaryRow>("creative_summary.csv"),
        readCsv<DailyRow>("creative_daily_country_os_stats.csv"),
        readCsv<CampaignRow>("campaigns.csv"),
        readCsv<AdvertiserRow>("advertisers.csv"),
      ]);

      const campaignsById = new Map(campaignRows.map((row) => [row.campaign_id, row]));
      const segmentMetricsByCreative = new Map<string, Map<string, SegmentMetrics>>();
      const dailyMetricsByCreative = new Map<string, Map<string, SegmentMetrics>>();
      const countries = new Set<string>();
      const oses = new Set<string>();
      const dates = new Set<string>();

      for (const row of dailyRows) {
        countries.add(row.country);
        oses.add(row.os);
        dates.add(row.date);

        const creativeSegments = segmentMetricsByCreative.get(row.creative_id) ?? new Map<string, SegmentMetrics>();
        const allKey = segmentKey("All", "All");
        const countryKey = segmentKey(row.country, "All");
        const osKey = segmentKey("All", row.os);
        const exactKey = segmentKey(row.country, row.os);

        for (const key of [allKey, countryKey, osKey, exactKey]) {
          const metrics = creativeSegments.get(key) ?? emptyMetrics();
          addToMetrics(metrics, row);
          creativeSegments.set(key, metrics);
        }
        segmentMetricsByCreative.set(row.creative_id, creativeSegments);

        const dailyMetrics = dailyMetricsByCreative.get(row.creative_id) ?? new Map<string, SegmentMetrics>();
        const day = dailyMetrics.get(row.date) ?? emptyMetrics();
        addToMetrics(day, row);
        dailyMetrics.set(row.date, day);
        dailyMetricsByCreative.set(row.creative_id, dailyMetrics);
      }

      for (const creativeSegments of segmentMetricsByCreative.values()) {
        for (const metrics of creativeSegments.values()) {
          finalizeMetrics(metrics);
        }
      }

      const creatives: Creative[] = creativeRows.map((row) => {
        const campaign = campaignsById.get(row.campaign_id);
        const dailySeries = [...(dailyMetricsByCreative.get(row.creative_id)?.entries() ?? [])]
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([, metrics]) => finalizeMetrics(metrics).ctr);

        return {
          creativeId: row.creative_id,
          campaignId: row.campaign_id,
          campaignLabel: campaign ? makeCampaignLabel(campaign) : `${row.campaign_id} - ${row.app_name}`,
          advertiser: row.advertiser_name,
          appName: row.app_name,
          vertical: row.vertical,
          format: row.format,
          status: row.creative_status,
          fatigueDay: row.fatigue_day ? Number(row.fatigue_day) : null,
          totalDaysActive: parseNumber(row.total_days_active),
          totalSpendUsd: parseNumber(row.total_spend_usd),
          totalImpressions: parseNumber(row.total_impressions),
          totalClicks: parseNumber(row.total_clicks),
          totalConversions: parseNumber(row.total_conversions),
          totalRevenueUsd: parseNumber(row.total_revenue_usd),
          overallCtr: parseNumber(row.overall_ctr),
          overallCvr: parseNumber(row.overall_cvr),
          overallIpm: parseNumber(row.overall_ipm),
          overallRoas: parseNumber(row.overall_roas),
          first7dCtr: parseNumber(row.first_7d_ctr),
          last7dCtr: parseNumber(row.last_7d_ctr),
          ctrDecayPct: parseNumber(row.ctr_decay_pct),
          first7dCvr: parseNumber(row.first_7d_cvr),
          last7dCvr: parseNumber(row.last_7d_cvr),
          cvrDecayPct: parseNumber(row.cvr_decay_pct),
          perfScore: parseNumber(row.perf_score),
          width: parseNumber(row.width),
          height: parseNumber(row.height),
          language: row.language,
          launchDate: row.creative_launch_date,
          theme: row.theme,
          hookType: row.hook_type,
          ctaText: row.cta_text,
          headline: row.headline,
          subhead: row.subhead,
          dominantColor: row.dominant_color,
          emotionalTone: row.emotional_tone,
          durationSec: parseNumber(row.duration_sec),
          textDensity: parseNumber(row.text_density),
          copyLengthChars: parseNumber(row.copy_length_chars),
          readabilityScore: parseNumber(row.readability_score),
          brandVisibilityScore: parseNumber(row.brand_visibility_score),
          clutterScore: parseNumber(row.clutter_score),
          noveltyScore: parseNumber(row.novelty_score),
          motionScore: parseNumber(row.motion_score),
          facesCount: parseNumber(row.faces_count),
          productCount: parseNumber(row.product_count),
          hasPrice: parseBool(row.has_price),
          hasDiscountBadge: parseBool(row.has_discount_badge),
          hasGameplay: parseBool(row.has_gameplay),
          hasUgcStyle: parseBool(row.has_ugc_style),
          assetFile: row.asset_file,
          segmentMetrics: Object.fromEntries(segmentMetricsByCreative.get(row.creative_id) ?? []),
          sparkline: compactSparkline(dailySeries),
        };
      });

      const sortedDates = uniqueSorted(dates);

      return {
        datasetStats: {
          advertisers: advertiserRows.length,
          campaigns: campaignRows.length,
          creatives: creativeRows.length,
          dailyRows: dailyRows.length,
          dateRange: `${sortedDates[0]} to ${sortedDates[sortedDates.length - 1]}`,
        },
        filters: {
          advertisers: uniqueSorted(creativeRows.map((row) => row.advertiser_name)),
          campaigns: campaignRows
            .map((row) => ({
              id: row.campaign_id,
              label: makeCampaignLabel(row),
              advertiser: row.advertiser_name,
              vertical: row.vertical,
            }))
            .sort((left, right) => left.label.localeCompare(right.label)),
          countries: uniqueSorted(countries),
          oses: uniqueSorted(oses),
          formats: uniqueSorted(creativeRows.map((row) => row.format)),
          verticals: uniqueSorted(creativeRows.map((row) => row.vertical)),
        },
        creatives,
      };
    })();
  }

  return cachedData;
}
