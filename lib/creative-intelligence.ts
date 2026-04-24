import { readFile } from "node:fs/promises";
import path from "node:path";
import Papa from "papaparse";

const datasetDir = path.join(process.cwd(), "Smadex_Creative_Intelligence_Dataset_FULL");

type CreativeSummaryRow = {
  creative_id: string;
  campaign_id: string;
  advertiser_name: string;
  app_name: string;
  vertical: string;
  format: string;
  creative_status: string;
  fatigue_day: string;
  total_spend_usd: string;
  total_impressions: string;
  total_clicks: string;
  total_conversions: string;
  total_revenue_usd: string;
  overall_ctr: string;
  overall_cvr: string;
  overall_roas: string;
  ctr_decay_pct: string;
  cvr_decay_pct: string;
  width: string;
  height: string;
  language: string;
  theme: string;
  hook_type: string;
  cta_text: string;
  headline: string;
  subhead: string;
  dominant_color: string;
  emotional_tone: string;
  text_density: string;
  readability_score: string;
  brand_visibility_score: string;
  clutter_score: string;
  novelty_score: string;
  motion_score: string;
  has_price: string;
  has_discount_badge: string;
  has_gameplay: string;
  has_ugc_style: string;
  asset_file: string;
  perf_score: string;
};

type DailyRow = {
  campaign_id: string;
  creative_id: string;
  country: string;
  os: string;
  spend_usd: string;
  impressions: string;
  clicks: string;
  conversions: string;
  revenue_usd: string;
};

type CampaignRow = {
  campaign_id: string;
  advertiser_name: string;
  app_name: string;
};

type CreativeRecord = {
  creativeId: string;
  campaignId: string;
  advertiser: string;
  appName: string;
  vertical: string;
  format: string;
  status: string;
  fatigueDay: number | null;
  overallCtr: number;
  overallCvr: number;
  overallRoas: number;
  ctrDecayPct: number;
  cvrDecayPct: number;
  perfScore: number;
  theme: string;
  hookType: string;
  ctaText: string;
  headline: string;
  subhead: string;
  dominantColor: string;
  emotionalTone: string;
  textDensity: number;
  readabilityScore: number;
  brandVisibilityScore: number;
  clutterScore: number;
  noveltyScore: number;
  motionScore: number;
  hasPrice: boolean;
  hasDiscountBadge: boolean;
  hasGameplay: boolean;
  hasUgcStyle: boolean;
  assetFile: string;
  aspectRatio: string;
};

type AggregateSlice = {
  creativeId: string;
  campaignId: string;
  advertiser: string;
  appName: string;
  country: string;
  os: string;
  format: string;
  spendUsd: number;
  impressions: number;
  clicks: number;
  conversions: number;
  revenueUsd: number;
};

type Recommendation = {
  title: string;
  hypothesis: string;
  whyNow: string;
  supportingSignal: string;
};

export type MarketInsight = {
  key: {
    advertiser: string;
    campaignId: string;
    country: string;
    os: string;
    format: string;
  };
  marketMetrics: {
    spendUsd: number;
    ctr: number;
    cvr: number;
    roas: number;
  };
  narrative: {
    bestSummary: string;
    riskSummary: string;
    nextTestSummary: string;
  };
  topCreatives: Array<{
    creativeId: string;
    rank: number;
    headline: string;
    reason: string;
    perfScore: number;
    ctr: number;
    cvr: number;
    roas: number;
    assetFile: string;
    country: string;
    os: string;
    format: string;
  }>;
  fatiguedCreatives: Array<{
    creativeId: string;
    headline: string;
    reason: string;
    fatigueDay: number | null;
    ctrDecayPct: number;
    cvrDecayPct: number;
    format: string;
  }>;
  repetitiveCreatives: Array<{
    creativeId: string;
    headline: string;
    reason: string;
    clusterSize: number;
    noveltyScore: number;
    sharedTraits: string;
    format: string;
  }>;
  nextTests: Recommendation[];
};

export type DashboardData = {
  datasetStats: {
    advertisers: number;
    campaigns: number;
    creatives: number;
    dailyRows: number;
  };
  filters: {
    advertisers: string[];
    campaigns: Array<{ idLabel: string; advertiser: string }>;
    countries: string[];
    oses: string[];
    formats: string[];
  };
  markets: MarketInsight[];
  defaultMarket: MarketInsight;
};

let cachedData: Promise<DashboardData> | null = null;

function parseNumber(value: string | undefined) {
  if (!value) {
    return 0;
  }

  const result = Number(value);
  return Number.isFinite(result) ? result : 0;
}

function toTitleList(values: string[]) {
  return values.filter(Boolean).join(", ");
}

async function readCsv<T>(fileName: string) {
  const filePath = path.join(datasetDir, fileName);
  const csv = await readFile(filePath, "utf8");
  return Papa.parse<T>(csv, {
    header: true,
    skipEmptyLines: true,
  }).data;
}

function createCreativeMap(rows: CreativeSummaryRow[]) {
  return new Map(
    rows.map((row) => {
      const record: CreativeRecord = {
        creativeId: row.creative_id,
        campaignId: row.campaign_id,
        advertiser: row.advertiser_name,
        appName: row.app_name,
        vertical: row.vertical,
        format: row.format,
        status: row.creative_status,
        fatigueDay: row.fatigue_day ? Number(row.fatigue_day) : null,
        overallCtr: parseNumber(row.overall_ctr),
        overallCvr: parseNumber(row.overall_cvr),
        overallRoas: parseNumber(row.overall_roas),
        ctrDecayPct: parseNumber(row.ctr_decay_pct),
        cvrDecayPct: parseNumber(row.cvr_decay_pct),
        perfScore: parseNumber(row.perf_score),
        theme: row.theme,
        hookType: row.hook_type,
        ctaText: row.cta_text,
        headline: row.headline,
        subhead: row.subhead,
        dominantColor: row.dominant_color,
        emotionalTone: row.emotional_tone,
        textDensity: parseNumber(row.text_density),
        readabilityScore: parseNumber(row.readability_score),
        brandVisibilityScore: parseNumber(row.brand_visibility_score),
        clutterScore: parseNumber(row.clutter_score),
        noveltyScore: parseNumber(row.novelty_score),
        motionScore: parseNumber(row.motion_score),
        hasPrice: row.has_price === "1",
        hasDiscountBadge: row.has_discount_badge === "1",
        hasGameplay: row.has_gameplay === "1",
        hasUgcStyle: row.has_ugc_style === "1",
        assetFile: row.asset_file,
        aspectRatio: `${row.width}x${row.height}`,
      };

      return [row.creative_id, record];
    }),
  );
}

function createCampaignMap(rows: CampaignRow[]) {
  return new Map(rows.map((row) => [row.campaign_id, row]));
}

function createSliceMap(dailyRows: DailyRow[], creatives: Map<string, CreativeRecord>) {
  const slices = new Map<string, AggregateSlice>();

  for (const row of dailyRows) {
    const creative = creatives.get(row.creative_id);

    if (!creative) {
      continue;
    }

    const key = [row.creative_id, row.country, row.os].join("::");
    const current = slices.get(key) ?? {
      creativeId: row.creative_id,
      campaignId: row.campaign_id,
      advertiser: creative.advertiser,
      appName: creative.appName,
      country: row.country,
      os: row.os,
      format: creative.format,
      spendUsd: 0,
      impressions: 0,
      clicks: 0,
      conversions: 0,
      revenueUsd: 0,
    };

    current.spendUsd += parseNumber(row.spend_usd);
    current.impressions += parseNumber(row.impressions);
    current.clicks += parseNumber(row.clicks);
    current.conversions += parseNumber(row.conversions);
    current.revenueUsd += parseNumber(row.revenue_usd);
    slices.set(key, current);
  }

  return [...slices.values()];
}

function makeMarketKey(parts: MarketInsight["key"]) {
  return [parts.advertiser, parts.campaignId, parts.country, parts.os, parts.format].join("::");
}

function uniqueSorted(values: Iterable<string>) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function recommendationSignals(creatives: CreativeRecord[]) {
  const top = creatives.filter((creative) => creative.status === "top_performer");
  const weak = creatives.filter((creative) => creative.status === "underperformer");
  const source = top.length > 0 ? top : creatives;
  const weakSource = weak.length > 0 ? weak : creatives;

  const suggestions: Recommendation[] = [];

  const topFormats = uniqueSorted(source.map((creative) => creative.format)).slice(0, 2);
  if (topFormats.length > 0) {
    suggestions.push({
      title: `Lean into ${toTitleList(topFormats)} formats`,
      hypothesis:
        `Winning creatives in this slice concentrate in ${toTitleList(topFormats)}, suggesting the format itself is helping the message land more efficiently.`,
      whyNow: "The best performers already prove this format can scale.",
      supportingSignal: `${top.length} top performers are over-indexed in these formats.`,
    });
  }

  const bestThemes = uniqueSorted(source.map((creative) => creative.theme)).slice(0, 2);
  const weakThemes = uniqueSorted(weakSource.map((creative) => creative.theme)).slice(0, 2);
  if (bestThemes.length > 0) {
    suggestions.push({
      title: `Refresh the concept around ${toTitleList(bestThemes)}`,
      hypothesis:
        `Themes like ${toTitleList(bestThemes)} appear in stronger creatives, while weaker ads lean more toward ${toTitleList(weakThemes)}. Test the same offer with a new visual spin around the stronger concepts.`,
      whyNow: "This is the fastest path to a creative iteration instead of a full concept reset.",
      supportingSignal: `Top performers show stronger thematic concentration than underperformers.`,
    });
  }

  const useMoreUgc = source.some((creative) => creative.hasUgcStyle) && !weakSource.every((creative) => creative.hasUgcStyle);
  if (useMoreUgc) {
    suggestions.push({
      title: "Test a UGC-style variant with the winning message",
      hypothesis:
        "The best ads hint that a more native, less polished delivery can keep attention without changing the core proposition. Keep the headline, swap the packaging.",
      whyNow: "It is a low-friction creative test with clear visual differentiation.",
      supportingSignal: "UGC styling appears among winners but is not saturated across the full set.",
    });
  }

  const fatiguePresent = creatives.some((creative) => creative.status === "fatigued");
  if (fatiguePresent) {
    suggestions.push({
      title: "Rotate a fresh hook before fatigue deepens",
      hypothesis:
        "A new opening angle can preserve the winning value proposition while giving the audience something visually and verbally fresh.",
      whyNow: "Fatigued creatives are already showing decay, so replacement timing matters more than squeezing extra volume.",
      supportingSignal: "CTR and CVR decay are already visible in the current portfolio.",
    });
  }

  return suggestions.slice(0, 3);
}

function buildMarketInsight(
  key: MarketInsight["key"],
  slices: AggregateSlice[],
  creativesById: Map<string, CreativeRecord>,
) {
  const enriched = slices
    .map((slice) => {
      const creative = creativesById.get(slice.creativeId);
      if (!creative || slice.impressions === 0 || slice.clicks === 0 || slice.spendUsd === 0) {
        return null;
      }

      const ctr = slice.clicks / slice.impressions;
      const cvr = slice.conversions / Math.max(slice.clicks, 1);
      const roas = slice.revenueUsd / Math.max(slice.spendUsd, 1);
      const score = ctr * 0.35 + cvr * 0.3 + Math.min(roas / 10, 1) * 0.2 + creative.perfScore * 0.15;

      return { slice, creative, ctr, cvr, roas, score };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .sort((left, right) => right.score - left.score);

  const filteredCreatives = enriched.map((item) => item.creative);
  const top = enriched.slice(0, 3);
  const fatigued = filteredCreatives
    .filter((creative) => creative.status === "fatigued" || creative.ctrDecayPct < -0.15)
    .sort((left, right) => left.ctrDecayPct - right.ctrDecayPct)
    .slice(0, 3);

  const repetitionGroups = new Map<string, CreativeRecord[]>();
  for (const creative of filteredCreatives) {
    const signature = [
      creative.theme,
      creative.hookType,
      creative.ctaText,
      creative.dominantColor,
      creative.format,
      creative.aspectRatio,
    ].join("::");
    const group = repetitionGroups.get(signature) ?? [];
    group.push(creative);
    repetitionGroups.set(signature, group);
  }

  const repetitive = [...repetitionGroups.entries()]
    .filter(([, group]) => group.length > 1)
    .flatMap(([signature, group]) =>
      group.map((creative) => ({
        creative,
        clusterSize: group.length,
        signature,
      })),
    )
    .sort((left, right) => {
      const leftScore = left.clusterSize * (1 - left.creative.noveltyScore);
      const rightScore = right.clusterSize * (1 - right.creative.noveltyScore);
      return rightScore - leftScore;
    })
    .slice(0, 3);

  const totals = enriched.reduce(
    (accumulator, item) => {
      accumulator.spendUsd += item.slice.spendUsd;
      accumulator.impressions += item.slice.impressions;
      accumulator.clicks += item.slice.clicks;
      accumulator.conversions += item.slice.conversions;
      accumulator.revenueUsd += item.slice.revenueUsd;
      return accumulator;
    },
    { spendUsd: 0, impressions: 0, clicks: 0, conversions: 0, revenueUsd: 0 },
  );

  const bestSummary = top[0]
    ? `${top[0].creative.headline} leads this slice with ${formatMetric(top[0].ctr, "pct")} CTR and ${top[0].roas.toFixed(2)}x ROAS, while ${top[1]?.creative.theme ?? "similar concepts"} also shows strong follow-through.`
    : "No creatives match this exact filter combination yet.";
  const riskSummary = fatigued[0] || repetitive[0]
    ? `${fatigued[0]?.headline ?? repetitive[0]?.creative.headline} is the clearest risk signal here, with decay or similarity patterns suggesting the audience has seen too much of the same idea.`
    : "This slice has limited fatigue and repetition signals compared with the broader portfolio.";
  const nextTests = recommendationSignals(filteredCreatives);

  return {
    key,
    marketMetrics: {
      spendUsd: totals.spendUsd,
      ctr: totals.clicks / Math.max(totals.impressions, 1),
      cvr: totals.conversions / Math.max(totals.clicks, 1),
      roas: totals.revenueUsd / Math.max(totals.spendUsd, 1),
    },
    narrative: {
      bestSummary,
      riskSummary,
      nextTestSummary: nextTests[0]?.hypothesis ?? "There is not enough signal in this slice, so broaden the filters to generate a stronger testing recommendation.",
    },
    topCreatives: top.map((item, index) => ({
      creativeId: item.creative.creativeId,
      rank: index + 1,
      headline: item.creative.headline,
      reason: `${item.creative.theme} + ${item.creative.hookType} is converting efficiently in ${item.slice.country}/${item.slice.os} with ${formatMetric(item.cvr, "pct")} CVR and ${item.slice.conversions.toLocaleString()} conversions.`,
      perfScore: item.creative.perfScore,
      ctr: item.ctr,
      cvr: item.cvr,
      roas: item.roas,
      assetFile: item.creative.assetFile,
      country: item.slice.country,
      os: item.slice.os,
      format: item.creative.format,
    })),
    fatiguedCreatives: fatigued.map((creative) => ({
      creativeId: creative.creativeId,
      headline: creative.headline,
      reason: `${creative.theme} is fading with CTR ${formatMetric(creative.ctrDecayPct, "delta")} and CVR ${formatMetric(creative.cvrDecayPct, "delta")} versus its early-life baseline.`,
      fatigueDay: creative.fatigueDay,
      ctrDecayPct: creative.ctrDecayPct,
      cvrDecayPct: creative.cvrDecayPct,
      format: creative.format,
    })),
    repetitiveCreatives: repetitive.map(({ creative, clusterSize }) => ({
      creativeId: creative.creativeId,
      headline: creative.headline,
      reason: `This asset repeats a familiar mix of ${creative.theme}, ${creative.hookType}, ${creative.ctaText}, and ${creative.dominantColor}, making the portfolio feel overly uniform.`,
      clusterSize,
      noveltyScore: creative.noveltyScore,
      sharedTraits: `${creative.theme}, ${creative.hookType}, ${creative.ctaText}`,
      format: creative.format,
    })),
    nextTests,
  } satisfies MarketInsight;
}

function formatMetric(value: number, type: "pct" | "delta") {
  if (type === "pct") {
    return `${(value * 100).toFixed(2)}%`;
  }

  const sign = value >= 0 ? "+" : "-";
  return `${sign}${(Math.abs(value) * 100).toFixed(0)}%`;
}

export async function getDashboardData(): Promise<DashboardData> {
  if (!cachedData) {
    cachedData = (async () => {
      const [creativeRows, dailyRows, campaignRows] = await Promise.all([
        readCsv<CreativeSummaryRow>("creative_summary.csv"),
        readCsv<DailyRow>("creative_daily_country_os_stats.csv"),
        readCsv<CampaignRow>("campaigns.csv"),
      ]);

      const creativesById = createCreativeMap(creativeRows);
      const campaignsById = createCampaignMap(campaignRows);
      const slices = createSliceMap(dailyRows, creativesById);
      const advertisers = uniqueSorted(creativeRows.map((row) => row.advertiser_name));
      const countries = uniqueSorted(dailyRows.map((row) => row.country));
      const oses = uniqueSorted(dailyRows.map((row) => row.os));
      const formats = uniqueSorted(creativeRows.map((row) => row.format));

      const sliceBuckets = new Map<string, AggregateSlice[]>();

      for (const slice of slices) {
        const campaignLabel = `${slice.campaignId} - ${campaignsById.get(slice.campaignId)?.app_name ?? slice.appName}`;
        const advertiserOptions = ["All", slice.advertiser];
        const campaignOptions = ["All", campaignLabel];
        const countryOptions = ["All", slice.country];
        const osOptions = ["All", slice.os];
        const formatOptions = ["All", slice.format];

        const keys: MarketInsight["key"][] = [];

        for (const advertiser of advertiserOptions) {
          for (const campaignId of campaignOptions) {
            if (advertiser === "All" && campaignId !== "All") {
              continue;
            }

            for (const country of countryOptions) {
              for (const os of osOptions) {
                for (const format of formatOptions) {
                  keys.push({ advertiser, campaignId, country, os, format });
                }
              }
            }
          }
        }

        for (const key of keys) {
          const bucketKey = makeMarketKey(key);
          const bucket = sliceBuckets.get(bucketKey) ?? [];
          bucket.push(slice);
          sliceBuckets.set(bucketKey, bucket);
        }
      }

      const markets = [...sliceBuckets.entries()]
        .map(([bucketKey, bucket]) => {
          const [advertiser, campaignId, country, os, format] = bucketKey.split("::");
          return buildMarketInsight({ advertiser, campaignId, country, os, format }, bucket, creativesById);
        })
        .filter((market) => market.topCreatives.length > 0);

      const defaultMarket =
        markets.find((market) => makeMarketKey(market.key) === makeMarketKey({ advertiser: "All", campaignId: "All", country: "All", os: "All", format: "All" })) ?? markets[0];

      return {
        datasetStats: {
          advertisers: advertisers.length,
          campaigns: campaignRows.length,
          creatives: creativeRows.length,
          dailyRows: dailyRows.length,
        },
        filters: {
          advertisers,
          campaigns: campaignRows
            .map((row) => ({
              idLabel: `${row.campaign_id} - ${row.app_name}`,
              advertiser: row.advertiser_name,
            }))
            .sort((left, right) => left.idLabel.localeCompare(right.idLabel)),
          countries,
          oses,
          formats,
        },
        markets,
        defaultMarket,
      };
    })();
  }

  return cachedData;
}
