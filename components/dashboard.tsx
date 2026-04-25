"use client";

import {
  Activity,
  Bot,
  ChevronRight,
  CirclePause,
  FlaskConical,
  Layers3,
  RefreshCw,
  Rocket,
  Search,
  ShieldAlert,
  TrendingDown,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { Creative, DashboardData, SegmentMetrics } from "@/lib/creative-intelligence";

type DashboardProps = {
  data: DashboardData;
};

type Filters = {
  advertiser: string;
  campaignId: string;
  vertical: string;
  country: string;
  os: string;
  format: string;
  search: string;
};

type RankedCreative = {
  creative: Creative;
  metrics: SegmentMetrics;
  score: number;
  action: "Scale" | "Refresh" | "Pause" | "Test";
};

type Cluster = {
  key: string;
  creatives: RankedCreative[];
  traits: string;
  best: RankedCreative;
  weakest: RankedCreative;
  avgScore: number;
};

type TraitInsight = {
  label: string;
  value: string;
  lift: number;
  count: number;
  explanation: string;
};

const initialFilters: Filters = {
  advertiser: "All",
  campaignId: "All",
  vertical: "All",
  country: "All",
  os: "All",
  format: "All",
  search: "",
};

function formatPct(value: number, digits = 2) {
  return `${(value * 100).toFixed(digits)}%`;
}

function formatDelta(value: number) {
  const sign = value >= 0 ? "+" : "-";
  return `${sign}${Math.abs(value * 100).toFixed(0)}%`;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function compactNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function options(values: string[]) {
  return ["All", ...values];
}

type FilterField = Exclude<keyof Filters, "search">;

const filterFields: FilterField[] = ["advertiser", "vertical", "campaignId", "country", "os", "format"];

function matchesFilterValue(creative: Creative, field: FilterField, value: string) {
  if (value === "All") {
    return true;
  }

  if (field === "advertiser") {
    return creative.advertiser === value;
  }

  if (field === "vertical") {
    return creative.vertical === value;
  }

  if (field === "campaignId") {
    return creative.campaignId === value;
  }

  if (field === "format") {
    return creative.format === value;
  }

  return true;
}

function hasSegmentDelivery(creative: Creative, country: string, os: string) {
  return (creative.segmentMetrics[`${country}::${os}`]?.impressions ?? 0) > 0;
}

function creativeMatchesFilters(creative: Creative, filters: Filters, ignoredField?: FilterField) {
  for (const field of filterFields) {
    if (field === ignoredField || field === "country" || field === "os") {
      continue;
    }

    if (!matchesFilterValue(creative, field, filters[field])) {
      return false;
    }
  }

  const country = ignoredField === "country" ? "All" : filters.country;
  const os = ignoredField === "os" ? "All" : filters.os;
  return hasSegmentDelivery(creative, country, os);
}

function valueForField(creative: Creative, field: FilterField) {
  if (field === "advertiser") {
    return creative.advertiser;
  }

  if (field === "vertical") {
    return creative.vertical;
  }

  if (field === "campaignId") {
    return creative.campaignId;
  }

  if (field === "format") {
    return creative.format;
  }

  return "";
}

function getAvailableFilterValues(data: DashboardData, filters: Filters, field: FilterField) {
  const values = new Set<string>();

  if (field === "country" || field === "os") {
    for (const creative of data.creatives) {
      if (!creativeMatchesFilters(creative, filters, field)) {
        continue;
      }

      for (const [key, metrics] of Object.entries(creative.segmentMetrics)) {
        if (metrics.impressions <= 0) {
          continue;
        }

        const [country, os] = key.split("::");
        if (field === "country" && country !== "All" && (filters.os === "All" || os === filters.os)) {
          values.add(country);
        }
        if (field === "os" && os !== "All" && (filters.country === "All" || country === filters.country)) {
          values.add(os);
        }
      }
    }
  } else {
    for (const creative of data.creatives) {
      if (creativeMatchesFilters(creative, filters, field)) {
        values.add(valueForField(creative, field));
      }
    }
  }

  return [...values].filter(Boolean).sort((left, right) => left.localeCompare(right));
}

function sanitizeFilters(data: DashboardData, nextFilters: Filters) {
  let sanitized = { ...nextFilters };
  let changed = true;

  while (changed) {
    changed = false;
    for (const field of filterFields) {
      if (sanitized[field] === "All") {
        continue;
      }

      const available = getAvailableFilterValues(data, sanitized, field);
      if (!available.includes(sanitized[field])) {
        sanitized = { ...sanitized, [field]: "All" };
        changed = true;
      }
    }
  }

  return sanitized;
}

function getMetrics(creative: Creative, filters: Filters): SegmentMetrics {
  const key = `${filters.country}::${filters.os}`;
  return (
    creative.segmentMetrics[key] ?? {
      spendUsd: creative.totalSpendUsd,
      impressions: creative.totalImpressions,
      clicks: creative.totalClicks,
      conversions: creative.totalConversions,
      revenueUsd: creative.totalRevenueUsd,
      ctr: creative.overallCtr,
      cvr: creative.overallCvr,
      ipm: creative.overallIpm,
      roas: creative.overallRoas,
    }
  );
}

function rankCreative(creative: Creative, metrics: SegmentMetrics): RankedCreative {
  const scaleScore =
    metrics.ctr * 32 +
    metrics.cvr * 2.2 +
    Math.min(metrics.roas / 3, 1) * 0.9 +
    Math.min(metrics.ipm / 4, 1) * 0.9 +
    creative.perfScore * 1.4;
  const fatigueRisk =
    (creative.status === "fatigued" ? 1 : 0) +
    Math.max(0, Math.abs(Math.min(creative.ctrDecayPct, 0))) +
    Math.max(0, Math.abs(Math.min(creative.cvrDecayPct, 0)) * 0.35);
  const score = scaleScore - fatigueRisk * 0.45;

  let action: RankedCreative["action"] = "Test";
  if (metrics.impressions > 50000 && score > 2.2 && creative.ctrDecayPct > -0.55) {
    action = "Scale";
  } else if (metrics.impressions > 50000 && (creative.status === "fatigued" || creative.ctrDecayPct < -0.65)) {
    action = "Refresh";
  } else if (metrics.spendUsd > 5000 && score < 1.25) {
    action = "Pause";
  }

  return { creative, metrics, score, action };
}

function reasonForWinner(item: RankedCreative) {
  const { creative, metrics } = item;
  const traits = [
    creative.hookType,
    creative.theme,
    creative.hasUgcStyle ? "UGC-style" : "",
    creative.hasGameplay ? "gameplay visible" : "",
    creative.hasDiscountBadge ? "discount cue" : "",
  ].filter(Boolean);

  return `${traits.slice(0, 3).join(" + ")} is pulling efficient attention: ${formatPct(metrics.ctr)} CTR, ${formatPct(metrics.cvr)} CVR, ${metrics.ipm.toFixed(2)} IPM, and ${metrics.roas.toFixed(2)}x ROAS in this slice.`;
}

function reasonForFatigue(item: RankedCreative) {
  const { creative } = item;
  return `${creative.headline} has a ${formatDelta(creative.ctrDecayPct)} CTR shift from first to last 7 days${creative.fatigueDay ? `, with fatigue appearing around day ${creative.fatigueDay}` : ""}. Refresh the opening hook before scaling further.`;
}

function getClusterKey(creative: Creative) {
  const density = creative.textDensity > 0.45 ? "heavy-copy" : creative.textDensity < 0.25 ? "light-copy" : "balanced-copy";
  return [
    creative.vertical,
    creative.format,
    creative.theme,
    creative.hookType,
    creative.ctaText,
    creative.dominantColor,
    density,
    creative.hasUgcStyle ? "ugc" : "polished",
    creative.hasGameplay ? "gameplay" : "no-gameplay",
  ].join("::");
}

function buildClusters(items: RankedCreative[]) {
  const groups = new Map<string, RankedCreative[]>();

  for (const item of items) {
    const key = getClusterKey(item.creative);
    const group = groups.get(key) ?? [];
    group.push(item);
    groups.set(key, group);
  }

  return [...groups.entries()]
    .filter(([, group]) => group.length > 1)
    .map(([key, group]) => {
      const sorted = [...group].sort((left, right) => right.score - left.score);
      const [vertical, format, theme, hook, cta, color] = key.split("::");
      return {
        key,
        creatives: sorted,
        traits: `${vertical}, ${format}, ${theme}, ${hook}, ${cta}, ${color}`,
        best: sorted[0],
        weakest: sorted[sorted.length - 1],
        avgScore: sorted.reduce((sum, item) => sum + item.score, 0) / sorted.length,
      };
    })
    .sort((left, right) => right.creatives.length - left.creatives.length || right.avgScore - left.avgScore)
    .slice(0, 5);
}

function buildTraitInsights(items: RankedCreative[]) {
  const population = items.filter((item) => item.metrics.impressions > 1000);
  const baseline = population.reduce((sum, item) => sum + item.score, 0) / Math.max(population.length, 1);
  const traitBuckets = new Map<string, { label: string; value: string; items: RankedCreative[] }>();

  function add(label: string, value: string, item: RankedCreative) {
    if (!value) {
      return;
    }
    const key = `${label}:${value}`;
    const bucket = traitBuckets.get(key) ?? { label, value, items: [] };
    bucket.items.push(item);
    traitBuckets.set(key, bucket);
  }

  for (const item of population) {
    add("Hook", item.creative.hookType, item);
    add("Theme", item.creative.theme, item);
    add("CTA", item.creative.ctaText, item);
    add("Tone", item.creative.emotionalTone, item);
    add("Color", item.creative.dominantColor, item);
    add("UGC style", item.creative.hasUgcStyle ? "present" : "absent", item);
    add("Gameplay", item.creative.hasGameplay ? "present" : "absent", item);
    add("Brand visibility", item.creative.brandVisibilityScore >= 0.65 ? "high" : "moderate/low", item);
    add("Clutter", item.creative.clutterScore <= 0.35 ? "clean" : "busy", item);
  }

  return [...traitBuckets.values()]
    .filter((bucket) => bucket.items.length >= 3)
    .map<TraitInsight>((bucket) => {
      const avg = bucket.items.reduce((sum, item) => sum + item.score, 0) / bucket.items.length;
      const lift = baseline > 0 ? (avg - baseline) / baseline : 0;
      return {
        label: bucket.label,
        value: bucket.value,
        lift,
        count: bucket.items.length,
        explanation: `${bucket.value} ${bucket.label.toLowerCase()} appears in ${bucket.items.length} creatives and indexes ${formatDelta(lift)} versus the selected slice average.`,
      };
    })
    .sort((left, right) => right.lift - left.lift)
    .slice(0, 8);
}

function summarizeMetrics(items: RankedCreative[]) {
  const totals = items.reduce(
    (acc, item) => {
      acc.spendUsd += item.metrics.spendUsd;
      acc.impressions += item.metrics.impressions;
      acc.clicks += item.metrics.clicks;
      acc.conversions += item.metrics.conversions;
      acc.revenueUsd += item.metrics.revenueUsd;
      return acc;
    },
    { spendUsd: 0, impressions: 0, clicks: 0, conversions: 0, revenueUsd: 0 },
  );

  return {
    ...totals,
    ctr: totals.clicks / Math.max(totals.impressions, 1),
    cvr: totals.conversions / Math.max(totals.clicks, 1),
    ipm: (totals.conversions / Math.max(totals.impressions, 1)) * 1000,
    roas: totals.revenueUsd / Math.max(totals.spendUsd, 1),
  };
}

function Select({
  label,
  value,
  onChange,
  values,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  values: string[];
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {values.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function Sparkline({ values }: { values: number[] }) {
  if (values.length === 0) {
    return <div className="sparkline empty" />;
  }

  const width = 160;
  const height = 44;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = Math.max(max - min, 0.0001);
  const points = values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * width;
      const y = height - ((value - min) / range) * (height - 8) - 4;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg className="sparkline" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="CTR trend">
      <polyline points={points} />
    </svg>
  );
}

function ActionBadge({ action }: { action: RankedCreative["action"] }) {
  const Icon = action === "Scale" ? Rocket : action === "Refresh" ? RefreshCw : action === "Pause" ? CirclePause : FlaskConical;
  return (
    <span className={`action-badge ${action.toLowerCase()}`}>
      <Icon size={14} />
      {action}
    </span>
  );
}

function CreativeCard({ item, rank }: { item: RankedCreative; rank: number }) {
  const { creative, metrics } = item;

  return (
    <article className="creative-card">
      <div className="creative-media">
        <img src={`/api/assets/${creative.assetFile}`} alt={creative.headline} />
        <span className="rank-badge">#{rank}</span>
      </div>
      <div className="creative-body">
        <div className="card-kicker">
          <ActionBadge action={item.action} />
          <span>{creative.format}</span>
          <span>{creative.vertical}</span>
        </div>
        <h3>{creative.headline}</h3>
        <p>{reasonForWinner(item)}</p>
        <div className="metric-strip">
          <Metric label="CTR" value={formatPct(metrics.ctr)} />
          <Metric label="CVR" value={formatPct(metrics.cvr)} />
          <Metric label="IPM" value={metrics.ipm.toFixed(2)} />
          <Metric label="ROAS" value={`${metrics.roas.toFixed(2)}x`} />
        </div>
        <div className="trait-row">
          <span>{creative.theme}</span>
          <span>{creative.hookType}</span>
          <span>{creative.emotionalTone}</span>
        </div>
      </div>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function RiskCard({ item }: { item: RankedCreative }) {
  const { creative, metrics } = item;
  return (
    <article className="risk-card">
      <div>
        <div className="card-kicker">
          <TrendingDown size={15} />
          <span>{creative.status}</span>
          <span>{creative.format}</span>
        </div>
        <h3>{creative.headline}</h3>
        <p>{reasonForFatigue(item)}</p>
      </div>
      <Sparkline values={creative.sparkline} />
      <div className="metric-strip compact">
        <Metric label="Spend" value={formatMoney(metrics.spendUsd)} />
        <Metric label="CTR delta" value={formatDelta(creative.ctrDecayPct)} />
        <Metric label="CVR delta" value={formatDelta(creative.cvrDecayPct)} />
      </div>
    </article>
  );
}

function ClusterCard({ cluster }: { cluster: Cluster }) {
  return (
    <article className="cluster-card">
      <div className="cluster-thumbs">
        {cluster.creatives.slice(0, 4).map((item) => (
          <img key={item.creative.creativeId} src={`/api/assets/${item.creative.assetFile}`} alt={item.creative.headline} />
        ))}
      </div>
      <div className="cluster-content">
        <div className="card-kicker">
          <Layers3 size={15} />
          <span>{cluster.creatives.length} similar creatives</span>
        </div>
        <h3>{cluster.best.creative.theme} cluster</h3>
        <p>{cluster.traits}. Best asset is {cluster.best.creative.headline}; weakest is {cluster.weakest.creative.headline}.</p>
        <div className="cluster-actions">
          <span>Best ROAS {cluster.best.metrics.roas.toFixed(2)}x</span>
          <span>Weakest score {cluster.weakest.score.toFixed(2)}</span>
        </div>
      </div>
    </article>
  );
}

function markdownToBlocks(markdown: string) {
  return markdown.split("\n").map((line, index) => {
    if (line.startsWith("### ") || line.startsWith("## ")) {
      return <h4 key={index}>{line.replace(/^###?\s/, "")}</h4>;
    }
    if (line.trim().startsWith("- ")) {
      return <li key={index}>{line.trim().slice(2)}</li>;
    }
    if (!line.trim()) {
      return null;
    }
    return <p key={index}>{line}</p>;
  });
}

export function Dashboard({ data }: DashboardProps) {
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [question, setQuestion] = useState("What should we scale, refresh, pause, and test next?");
  const [copilotAnswer, setCopilotAnswer] = useState("");
  const [copilotError, setCopilotError] = useState("");
  const [copilotLoading, setCopilotLoading] = useState(false);

  const availableFilters = useMemo(
    () => ({
      advertisers: getAvailableFilterValues(data, filters, "advertiser"),
      verticals: getAvailableFilterValues(data, filters, "vertical"),
      campaigns: getAvailableFilterValues(data, filters, "campaignId"),
      countries: getAvailableFilterValues(data, filters, "country"),
      oses: getAvailableFilterValues(data, filters, "os"),
      formats: getAvailableFilterValues(data, filters, "format"),
    }),
    [data, filters],
  );

  function updateFilter(field: FilterField, value: string) {
    setFilters((current) => sanitizeFilters(data, { ...current, [field]: value }));
  }

  const ranked = useMemo(() => {
    const term = filters.search.trim().toLowerCase();
    return data.creatives
      .filter((creative) => {
        return (
          (filters.advertiser === "All" || creative.advertiser === filters.advertiser) &&
          (filters.campaignId === "All" || creative.campaignId === filters.campaignId) &&
          (filters.vertical === "All" || creative.vertical === filters.vertical) &&
          (filters.format === "All" || creative.format === filters.format) &&
          (!term ||
            [creative.headline, creative.subhead, creative.theme, creative.hookType, creative.ctaText, creative.appName]
              .join(" ")
              .toLowerCase()
              .includes(term))
        );
      })
      .map((creative) => rankCreative(creative, getMetrics(creative, filters)))
      .filter((item) => item.metrics.impressions > 0)
      .sort((left, right) => right.score - left.score);
  }, [data.creatives, filters]);

  const market = useMemo(() => summarizeMetrics(ranked), [ranked]);
  const topPerformers = ranked.slice(0, 6);
  const fatigue = ranked
    .filter((item) => item.creative.status === "fatigued" || item.creative.ctrDecayPct < -0.7)
    .sort((left, right) => left.creative.ctrDecayPct - right.creative.ctrDecayPct)
    .slice(0, 5);
  const pauseList = ranked.filter((item) => item.action === "Pause").slice(0, 4);
  const testList = ranked.filter((item) => item.action === "Test").slice(0, 4);
  const clusters = useMemo(() => buildClusters(ranked), [ranked]);
  const traitInsights = useMemo(() => buildTraitInsights(ranked), [ranked]);

  const recommendationContext = useMemo(
    () => ({
      filters,
      market,
      topPerformers: topPerformers.slice(0, 4).map((item) => ({
        creativeId: item.creative.creativeId,
        headline: item.creative.headline,
        action: item.action,
        reason: reasonForWinner(item),
        metrics: item.metrics,
        traits: {
          format: item.creative.format,
          theme: item.creative.theme,
          hookType: item.creative.hookType,
          ctaText: item.creative.ctaText,
          tone: item.creative.emotionalTone,
        },
      })),
      fatigue: fatigue.slice(0, 4).map((item) => ({
        creativeId: item.creative.creativeId,
        headline: item.creative.headline,
        reason: reasonForFatigue(item),
        fatigueDay: item.creative.fatigueDay,
        ctrDecayPct: item.creative.ctrDecayPct,
        cvrDecayPct: item.creative.cvrDecayPct,
      })),
      traitInsights,
      recommendations: {
        scale: topPerformers.filter((item) => item.action === "Scale").slice(0, 3).map((item) => item.creative.headline),
        refresh: fatigue.slice(0, 3).map((item) => item.creative.headline),
        pause: pauseList.map((item) => item.creative.headline),
        test: testList.map((item) => `${item.creative.theme} / ${item.creative.hookType}`),
      },
    }),
    [fatigue, filters, market, pauseList, testList, topPerformers, traitInsights],
  );

  async function askCopilot() {
    setCopilotLoading(true);
    setCopilotError("");

    try {
      const response = await fetch("/api/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, context: recommendationContext }),
      });
      const payload = (await response.json()) as { content?: string; error?: string };
      if (!response.ok || !payload.content) {
        throw new Error(payload.error ?? "The copilot did not return an answer.");
      }
      setCopilotAnswer(payload.content);
    } catch (error) {
      setCopilotError(error instanceof Error ? error.message : "Unknown copilot error");
    } finally {
      setCopilotLoading(false);
    }
  }

  return (
    <main className="dashboard-shell">
      <section className="hero-band">
        <div className="hero-copy">
          <span className="eyebrow">Smadex Creative Intelligence</span>
          <h1>Creative decisions for live campaign teams.</h1>
          <p>
            Rank winners, diagnose fatigue, detect repeated ideas, and turn creative metadata into
            next tests a marketer can explain in one meeting.
          </p>
        </div>
        <div className="hero-ledger">
          <Metric label="Creatives" value={data.datasetStats.creatives.toLocaleString()} />
          <Metric label="Campaigns" value={data.datasetStats.campaigns.toLocaleString()} />
          <Metric label="Daily rows" value={data.datasetStats.dailyRows.toLocaleString()} />
          <Metric label="Window" value={data.datasetStats.dateRange.replace(" to ", " - ")} />
        </div>
      </section>

      <section className="control-band" aria-label="Dashboard filters">
        <div className="search-field">
          <Search size={18} />
          <input
            value={filters.search}
            onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
            placeholder="Search headline, theme, hook, CTA..."
          />
        </div>
        <Select
          label="Advertiser"
          value={filters.advertiser}
          values={options(availableFilters.advertisers)}
          onChange={(value) => updateFilter("advertiser", value)}
        />
        <Select
          label="Vertical"
          value={filters.vertical}
          values={options(availableFilters.verticals)}
          onChange={(value) => updateFilter("vertical", value)}
        />
        <Select
          label="Campaign"
          value={filters.campaignId}
          values={options(availableFilters.campaigns)}
          onChange={(value) => updateFilter("campaignId", value)}
        />
        <Select label="Country" value={filters.country} values={options(availableFilters.countries)} onChange={(value) => updateFilter("country", value)} />
        <Select label="OS" value={filters.os} values={options(availableFilters.oses)} onChange={(value) => updateFilter("os", value)} />
        <Select label="Format" value={filters.format} values={options(availableFilters.formats)} onChange={(value) => updateFilter("format", value)} />
      </section>

      <section className="market-row">
        <article className="market-card primary">
          <div className="card-kicker">
            <Activity size={16} />
            <span>Selected slice</span>
          </div>
          <strong>{ranked.length.toLocaleString()}</strong>
          <span>creatives analyzed</span>
        </article>
        <article className="market-card">
          <Metric label="Spend" value={formatMoney(market.spendUsd)} />
        </article>
        <article className="market-card">
          <Metric label="CTR" value={formatPct(market.ctr)} />
        </article>
        <article className="market-card">
          <Metric label="CVR" value={formatPct(market.cvr)} />
        </article>
        <article className="market-card">
          <Metric label="IPM" value={market.ipm.toFixed(2)} />
        </article>
        <article className="market-card">
          <Metric label="ROAS" value={`${market.roas.toFixed(2)}x`} />
        </article>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Top performers</span>
            <h2>What is working and why</h2>
          </div>
          <p>The ranking blends CTR, CVR, IPM, ROAS, volume, and fatigue risk for the current slice.</p>
        </div>
        <div className="creative-grid">
          {topPerformers.map((item, index) => (
            <CreativeCard key={item.creative.creativeId} item={item} rank={index + 1} />
          ))}
        </div>
      </section>

      <section className="two-column">
        <div className="section-block">
          <div className="section-heading tight">
            <div>
              <span className="eyebrow">Fatigue watchlist</span>
              <h2>Refresh before decay gets expensive</h2>
            </div>
          </div>
          <div className="stack">
            {fatigue.map((item) => (
              <RiskCard key={item.creative.creativeId} item={item} />
            ))}
          </div>
        </div>

        <div className="section-block">
          <div className="section-heading tight">
            <div>
              <span className="eyebrow">Winning traits</span>
              <h2>Patterns associated with better results</h2>
            </div>
          </div>
          <div className="trait-list">
            {traitInsights.map((trait) => (
              <article key={`${trait.label}-${trait.value}`} className="trait-card">
                <div>
                  <span>{trait.label}</span>
                  <strong>{trait.value}</strong>
                </div>
                <b>{formatDelta(trait.lift)}</b>
                <p>{trait.explanation}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Similarity clusters</span>
            <h2>Where the portfolio is repeating itself</h2>
          </div>
          <p>Clusters are grouped by creative traits so teams can compare similar ideas instead of isolated assets.</p>
        </div>
        <div className="cluster-grid">
          {clusters.map((cluster) => (
            <ClusterCard key={cluster.key} cluster={cluster} />
          ))}
        </div>
      </section>

      <section className="recommendation-grid">
        <article className="section-block recommendation-panel">
          <div className="section-heading tight">
            <div>
              <span className="eyebrow">Recommendation engine</span>
              <h2>Next actions</h2>
            </div>
          </div>
          <div className="action-list">
            <RecommendationRow icon={Rocket} title="Scale" items={topPerformers.filter((item) => item.action === "Scale").slice(0, 3)} />
            <RecommendationRow icon={RefreshCw} title="Refresh" items={fatigue.slice(0, 3)} />
            <RecommendationRow icon={CirclePause} title="Pause" items={pauseList} />
            <RecommendationRow icon={FlaskConical} title="Test next" items={testList} />
          </div>
        </article>

        <article className="section-block copilot-panel">
          <div className="section-heading tight">
            <div>
              <span className="eyebrow">AI copilot</span>
              <h2>Ask the data in plain English</h2>
            </div>
            <Bot size={24} />
          </div>
          <textarea value={question} onChange={(event) => setQuestion(event.target.value)} rows={3} />
          <button type="button" onClick={askCopilot} disabled={copilotLoading}>
            {copilotLoading ? "Asking copilot..." : "Ask copilot"}
            <ChevronRight size={18} />
          </button>
          {copilotError ? (
            <div className="copilot-error">
              <ShieldAlert size={18} />
              <span>{copilotError}</span>
            </div>
          ) : null}
          {copilotAnswer ? <div className="copilot-answer">{markdownToBlocks(copilotAnswer)}</div> : null}
        </article>
      </section>
    </main>
  );
}

function RecommendationRow({
  icon: Icon,
  title,
  items,
}: {
  icon: typeof Rocket;
  title: string;
  items: RankedCreative[];
}) {
  return (
    <div className="recommendation-row">
      <div className="recommendation-title">
        <Icon size={18} />
        <strong>{title}</strong>
      </div>
      <div className="recommendation-items">
        {items.length === 0 ? (
          <span className="muted">No strong candidates in this slice.</span>
        ) : (
          items.map((item) => (
            <span key={`${title}-${item.creative.creativeId}`}>
              {item.creative.headline} <b>{compactNumber(item.metrics.conversions)} conv.</b>
            </span>
          ))
        )}
      </div>
    </div>
  );
}
