"use client";

import { useMemo, useState } from "react";
import type { CampaignGroup, DashboardData, MarketInsight } from "@/lib/creative-intelligence";

type DashboardProps = {
  data: DashboardData;
};

type Filters = {
  advertiser: string;
  campaignId: string;
  country: string;
  os: string;
  format: string;
};

type CampaignSort = "roas" | "spend" | "ctr" | "fatigue";

type AggregatedCampaign = Omit<
  CampaignGroup,
  "country" | "os" | "format" | "ctr" | "cvr" | "roas" | "creativeIds" | "fatiguedCreativeIds"
> & {
  ctr: number;
  cvr: number;
  roas: number;
  countries: string[];
  oses: string[];
  formats: string[];
};

function formatPct(value: number) {
  return `${(value * 100).toFixed(2)}%`;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDelta(value: number) {
  const pct = `${Math.abs(value * 100).toFixed(0)}%`;
  return value < 0 ? `-${pct}` : `+${pct}`;
}

function formatConfidence(value: number) {
  return `${Math.round(value * 100)}%`;
}

function campaignAction(campaign: AggregatedCampaign) {
  const fatigueRate = campaign.creativeCount > 0 ? campaign.fatiguedCount / campaign.creativeCount : 0;

  if (fatigueRate >= 0.35) {
    return {
      label: "Rotate",
      tone: "rotate",
      reason: "High fatigue concentration",
    };
  }

  if (campaign.roas >= 4 && campaign.ctr >= 0.006) {
    return {
      label: "Scale",
      tone: "scale",
      reason: "Efficient ROAS and strong attention",
    };
  }

  return {
    label: "Test",
    tone: "test",
    reason: "Needs a sharper creative iteration",
  };
}

function getOptions(values: string[]) {
  return ["All", ...values];
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <label className="filter">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function CreativeCard({ creative }: { creative: MarketInsight["topCreatives"][number] }) {
  return (
    <article className="creative-card">
      <img src={`/api/assets/${creative.assetFile}`} alt={creative.headline} />
      <div className="creative-copy">
        <div className="pill-row">
          <span className="pill strong">#{creative.rank}</span>
          <span className="pill">{creative.creativeId}</span>
          <span className="pill">{creative.format}</span>
          <span className="pill">{creative.country}</span>
          <span className="pill">{creative.os}</span>
        </div>
        <h3>{creative.headline}</h3>
        <p>{creative.reason}</p>
        <dl>
          <div>
            <dt>Perf score</dt>
            <dd>{creative.perfScore.toFixed(3)}</dd>
          </div>
          <div>
            <dt>CTR</dt>
            <dd>{formatPct(creative.ctr)}</dd>
          </div>
          <div>
            <dt>CVR</dt>
            <dd>{formatPct(creative.cvr)}</dd>
          </div>
          <div>
            <dt>ROAS</dt>
            <dd>{creative.roas.toFixed(2)}x</dd>
          </div>
        </dl>
      </div>
    </article>
  );
}

function EmptyState({ label }: { label: string }) {
  return <div className="empty-state">{label}</div>;
}

function RiskCard({
  item,
  title,
  tone,
}: {
  item: MarketInsight["fatiguedCreatives"][number] | MarketInsight["repetitiveCreatives"][number];
  title: string;
  tone: string;
}) {
  return (
    <article className={`risk-card ${tone}`}>
      <div className="risk-topline">
        <span className="pill strong">{title}</span>
        <span className="pill">{item.format}</span>
      </div>
      <h3>{item.headline}</h3>
      <p>{item.reason}</p>
      <dl>
        {"fatigueDay" in item ? (
          <>
            <div>
              <dt>Fatigue day</dt>
              <dd>{item.fatigueDay ?? "-"}</dd>
            </div>
            <div>
              <dt>CTR change</dt>
              <dd>{formatDelta(item.ctrDecayPct)}</dd>
            </div>
            <div>
              <dt>CVR change</dt>
              <dd>{formatDelta(item.cvrDecayPct)}</dd>
            </div>
          </>
        ) : (
          <>
            <div>
              <dt>Cluster size</dt>
              <dd>{item.clusterSize}</dd>
            </div>
            <div>
              <dt>Novelty</dt>
              <dd>{item.noveltyScore.toFixed(2)}</dd>
            </div>
            <div>
              <dt>Overlap</dt>
              <dd>{item.sharedTraits}</dd>
            </div>
          </>
        )}
      </dl>
    </article>
  );
}

function CampaignGroupCard({
  campaign,
  onSelect,
}: {
  campaign: AggregatedCampaign;
  onSelect: () => void;
}) {
  const fatigueRate = campaign.creativeCount > 0 ? campaign.fatiguedCount / campaign.creativeCount : 0;
  const action = campaignAction(campaign);

  return (
    <article className="campaign-card">
      <div className="campaign-asset">
        <img src={`/api/assets/${campaign.topCreative.assetFile}`} alt={campaign.topCreative.headline} />
      </div>
      <div className="campaign-body">
        <div className="pill-row">
          <span className="pill strong">{campaign.campaignId}</span>
          <span className="pill">{campaign.advertiser}</span>
          <span className="pill">{campaign.formats.join(", ")}</span>
        </div>
        <div className={`campaign-decision ${action.tone}`}>
          <strong>{action.label}</strong>
          <span>{action.reason}</span>
        </div>
        <h3>{campaign.appName}</h3>
        <p>
          Top creative: {campaign.topCreative.headline}. {campaign.creativeCount} creatives across{" "}
          {campaign.countries.join(", ")} and {campaign.oses.join(", ")}.
        </p>
        <dl>
          <div>
            <dt>Spend</dt>
            <dd>{formatMoney(campaign.spendUsd)}</dd>
          </div>
          <div>
            <dt>ROAS</dt>
            <dd>{campaign.roas.toFixed(2)}x</dd>
          </div>
          <div>
            <dt>CTR</dt>
            <dd>{formatPct(campaign.ctr)}</dd>
          </div>
          <div>
            <dt>Fatigue</dt>
            <dd>{formatPct(fatigueRate)}</dd>
          </div>
        </dl>
        <button type="button" onClick={onSelect}>
          Open campaign
        </button>
      </div>
    </article>
  );
}

export function Dashboard({ data }: DashboardProps) {
  const [filters, setFilters] = useState<Filters>({
    advertiser: "All",
    campaignId: "All",
    country: "All",
    os: "All",
    format: "All",
  });
  const [aiSummary, setAiSummary] = useState<string>("");
  const [copilotQuestion, setCopilotQuestion] = useState(
    "Which creative should I scale this week, and what should I rotate?",
  );
  const [campaignSort, setCampaignSort] = useState<CampaignSort>("roas");
  const [loadingAi, setLoadingAi] = useState(false);
  const [aiError, setAiError] = useState<string>("");

  const availableCampaigns = useMemo(() => {
    const campaigns = data.filters.campaigns.filter(
      (campaign) => filters.advertiser === "All" || campaign.advertiser === filters.advertiser,
    );
    return getOptions(campaigns.map((campaign) => campaign.idLabel));
  }, [data.filters.campaigns, filters.advertiser]);

  const market = useMemo(() => {
    return (
      data.markets.find(
        (entry) =>
          entry.key.advertiser === filters.advertiser &&
          entry.key.campaignId === filters.campaignId &&
          entry.key.country === filters.country &&
          entry.key.os === filters.os &&
          entry.key.format === filters.format,
      ) ?? data.defaultMarket
    );
  }, [data.defaultMarket, data.markets, filters]);

  const groupedCampaigns = useMemo(() => {
    const campaigns = new Map<
      string,
      AggregatedCampaign & {
        creativeIds: Set<string>;
        fatiguedIds: Set<string>;
      }
    >();

    for (const group of data.campaignGroups) {
      if (filters.advertiser !== "All" && group.advertiser !== filters.advertiser) {
        continue;
      }
      if (filters.campaignId !== "All" && group.campaignLabel !== filters.campaignId) {
        continue;
      }
      if (filters.country !== "All" && group.country !== filters.country) {
        continue;
      }
      if (filters.os !== "All" && group.os !== filters.os) {
        continue;
      }
      if (filters.format !== "All" && group.format !== filters.format) {
        continue;
      }

      const current = campaigns.get(group.campaignId) ?? {
        ...group,
        spendUsd: 0,
        impressions: 0,
        clicks: 0,
        conversions: 0,
        revenueUsd: 0,
        creativeCount: 0,
        fatiguedCount: 0,
        ctr: 0,
        cvr: 0,
        roas: 0,
        countries: [],
        oses: [],
        formats: [],
        creativeIds: new Set<string>(),
        fatiguedIds: new Set<string>(),
      };

      current.spendUsd += group.spendUsd;
      current.impressions += group.impressions;
      current.clicks += group.clicks;
      current.conversions += group.conversions;
      current.revenueUsd += group.revenueUsd;
      for (const creativeId of group.creativeIds) {
        current.creativeIds.add(creativeId);
      }
      for (const creativeId of group.fatiguedCreativeIds) {
        current.fatiguedIds.add(creativeId);
      }
      current.countries = [...new Set([...current.countries, group.country])].sort();
      current.oses = [...new Set([...current.oses, group.os])].sort();
      current.formats = [...new Set([...current.formats, group.format])].sort();

      const currentTopScore = current.topCreative.perfScore * current.roas;
      const groupTopScore = group.topCreative.perfScore * group.roas;
      if (groupTopScore > currentTopScore) {
        current.topCreative = group.topCreative;
      }

      campaigns.set(group.campaignId, current);
    }

    const ranked = [...campaigns.values()]
      .map(({ creativeIds, fatiguedIds, ...campaign }) => ({
        ...campaign,
        creativeCount: creativeIds.size,
        fatiguedCount: fatiguedIds.size,
        ctr: campaign.clicks / Math.max(campaign.impressions, 1),
        cvr: campaign.conversions / Math.max(campaign.clicks, 1),
        roas: campaign.revenueUsd / Math.max(campaign.spendUsd, 1),
      }))
      .sort((left, right) => {
        if (campaignSort === "spend") {
          return right.spendUsd - left.spendUsd;
        }
        if (campaignSort === "ctr") {
          return right.ctr - left.ctr;
        }
        if (campaignSort === "fatigue") {
          const rightFatigue = right.creativeCount > 0 ? right.fatiguedCount / right.creativeCount : 0;
          const leftFatigue = left.creativeCount > 0 ? left.fatiguedCount / left.creativeCount : 0;
          return rightFatigue - leftFatigue;
        }
        return right.roas - left.roas;
      })
      .slice(0, 6);

    return ranked;
  }, [campaignSort, data.campaignGroups, filters]);

  async function askCopilot(question?: string) {
    setLoadingAi(true);
    setAiError("");

    try {
      const response = await fetch("/api/recommend", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...market.key, question }),
      });
      const payload = (await response.json()) as { content?: string; error?: string };

      if (!response.ok || !payload.content) {
        throw new Error(payload.error ?? "Unknown AI error");
      }

      setAiSummary(payload.content);
    } catch (error) {
      setAiError(error instanceof Error ? error.message : "Unknown AI error");
    } finally {
      setLoadingAi(false);
    }
  }

  return (
    <main className="page-shell">
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">Smadex Creative Intelligence</span>
          <h1>Creative command center for mobile growth teams.</h1>
          <p>
            A working prototype that ranks winners, diagnoses fatigue, clusters similar concepts,
            and converts performance data into scale, rotate, and test decisions.
          </p>
        </div>
        <div className="hero-metrics">
          <div>
            <span>Total creatives</span>
            <strong>{data.datasetStats.creatives.toLocaleString()}</strong>
          </div>
          <div>
            <span>Advertisers</span>
            <strong>{data.datasetStats.advertisers}</strong>
          </div>
          <div>
            <span>Campaigns</span>
            <strong>{data.datasetStats.campaigns}</strong>
          </div>
          <div>
            <span>Daily rows</span>
            <strong>{data.datasetStats.dailyRows.toLocaleString()}</strong>
          </div>
        </div>
      </section>

      <section className="filters-panel">
        <Select
          label="Advertiser"
          value={filters.advertiser}
          onChange={(value) =>
            setFilters((current) => ({
              ...current,
              advertiser: value,
              campaignId: value === current.advertiser ? current.campaignId : "All",
            }))
          }
          options={getOptions(data.filters.advertisers)}
        />
        <Select
          label="Campaign"
          value={filters.campaignId}
          onChange={(value) => setFilters((current) => ({ ...current, campaignId: value }))}
          options={availableCampaigns}
        />
        <Select
          label="Country"
          value={filters.country}
          onChange={(value) => setFilters((current) => ({ ...current, country: value }))}
          options={getOptions(data.filters.countries)}
        />
        <Select
          label="OS"
          value={filters.os}
          onChange={(value) => setFilters((current) => ({ ...current, os: value }))}
          options={getOptions(data.filters.oses)}
        />
        <Select
          label="Format"
          value={filters.format}
          onChange={(value) => setFilters((current) => ({ ...current, format: value }))}
          options={getOptions(data.filters.formats)}
        />
      </section>

      <section className="summary-grid">
        <article className="summary-card accent">
          <span>Performance signal</span>
          <h2>Top performers</h2>
          <p>{market.narrative.bestSummary}</p>
        </article>
        <article className="summary-card amber">
          <span>Risk signal</span>
          <h2>Fatigue and repetition</h2>
          <p>{market.narrative.riskSummary}</p>
        </article>
        <article className="summary-card emerald">
          <span>Next move</span>
          <h2>Testing hypothesis</h2>
          <p>{market.narrative.nextTestSummary}</p>
        </article>
      </section>

      <section className="action-strip" aria-label="Recommended actions">
        {market.actionQueue.map((item) => (
          <article key={`${item.action}-${item.creativeId ?? item.title}`} className={`action-card ${item.action.toLowerCase()}`}>
            <span className="action-label">{item.action}</span>
            <h3>{item.title}</h3>
            <p>{item.rationale}</p>
            <div className="confidence">
              <span>Confidence</span>
              <strong>{formatConfidence(item.confidence)}</strong>
            </div>
          </article>
        ))}
      </section>

      <section className="board">
        <div className="board-header">
          <div>
            <span className="eyebrow">Group by campaign</span>
            <h2>Campaign performance comparison</h2>
          </div>
          <div className="campaign-toolbar">
            <div className="segmented-control" aria-label="Sort campaign groups">
              {[
                ["roas", "ROAS"],
                ["spend", "Spend"],
                ["ctr", "CTR"],
                ["fatigue", "Fatigue"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={campaignSort === value ? "active" : ""}
                  onClick={() => setCampaignSort(value as CampaignSort)}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="campaign-count">
              <span>Campaign groups</span>
              <strong>{groupedCampaigns.length}</strong>
            </div>
          </div>
        </div>
        <div className="campaign-grid">
          {groupedCampaigns.length > 0 ? (
            groupedCampaigns.map((campaign) => (
              <CampaignGroupCard
                key={campaign.campaignId}
                campaign={campaign}
                onSelect={() =>
                  setFilters((current) => ({
                    ...current,
                    advertiser: campaign.advertiser,
                    campaignId: campaign.campaignLabel,
                  }))
                }
              />
            ))
          ) : (
            <EmptyState label="No campaign groups match these filters." />
          )}
        </div>
      </section>

      <section className="board">
        <div className="board-header">
          <div>
            <span className="eyebrow">Top performers</span>
            <h2>Creative Performance Explorer</h2>
          </div>
          <div className="mini-stats">
            <div>
              <span>Market spend</span>
              <strong>{formatMoney(market.marketMetrics.spendUsd)}</strong>
            </div>
            <div>
              <span>Market CTR</span>
              <strong>{formatPct(market.marketMetrics.ctr)}</strong>
            </div>
            <div>
              <span>Market CVR</span>
              <strong>{formatPct(market.marketMetrics.cvr)}</strong>
            </div>
            <div>
              <span>Market ROAS</span>
              <strong>{market.marketMetrics.roas.toFixed(2)}x</strong>
            </div>
          </div>
        </div>
        <div className="creative-grid">
          {market.topCreatives.length > 0 ? (
            market.topCreatives.map((creative) => (
              <CreativeCard key={`${creative.creativeId}-${creative.country}-${creative.os}`} creative={creative} />
            ))
          ) : (
            <EmptyState label="No top performers match this exact filter. Broaden the slice to see stronger signals." />
          )}
        </div>
      </section>

      <section className="split-section">
        <div>
          <div className="section-heading">
            <span className="eyebrow">Fatigue detection</span>
            <h2>Creatives starting to wear out</h2>
          </div>
          <div className="risk-grid">
            {market.fatiguedCreatives.length > 0 ? (
              market.fatiguedCreatives.map((item) => (
                <RiskCard key={`fatigue-${item.creativeId}`} item={item} title="Tired" tone="amber" />
              ))
            ) : (
              <EmptyState label="No clear fatigue risk in this filtered view." />
            )}
          </div>
        </div>
        <div>
          <div className="section-heading">
            <span className="eyebrow">Similarity clustering</span>
            <h2>Creatives that feel repetitive</h2>
          </div>
          <div className="risk-grid">
            {market.repetitiveCreatives.length > 0 ? (
              market.repetitiveCreatives.map((item) => (
                <RiskCard key={`repeat-${item.creativeId}`} item={item} title="Repetitive" tone="violet" />
              ))
            ) : (
              <EmptyState label="No high-overlap creative cluster in this slice." />
            )}
          </div>
        </div>
      </section>

      <section className="recommendation-layout">
        <article className="recommendation-card">
          <div className="section-heading">
            <span className="eyebrow">Recommendation engine</span>
            <h2>What to test next</h2>
          </div>
          <div className="recommendation-list">
            {market.nextTests.map((test, index) => (
              <article key={`${test.title}-${index}`} className="test-card">
                <span className="pill strong">Test #{index + 1}</span>
                <h3>{test.title}</h3>
                <p>{test.hypothesis}</p>
                <div className="test-meta">
                  <span>Why now: {test.whyNow}</span>
                  <span>Signal: {test.supportingSignal}</span>
                </div>
              </article>
            ))}
          </div>
        </article>

        <article className="ai-card">
          <div className="section-heading">
            <span className="eyebrow">AI copilot</span>
            <h2>Ask the creative copilot</h2>
          </div>
          <p>
            Ask plain-English questions about the current filter. The copilot answers using the
            visible winners, fatigue signals, clusters, and recommendations.
          </p>
          <div className="prompt-row">
            <textarea
              value={copilotQuestion}
              onChange={(event) => setCopilotQuestion(event.target.value)}
              rows={4}
              aria-label="Ask the AI copilot"
            />
            <div className="button-row">
              <button type="button" onClick={() => askCopilot(copilotQuestion)} disabled={loadingAi}>
                {loadingAi ? "Thinking..." : "Ask copilot"}
              </button>
              <button type="button" onClick={() => askCopilot()} disabled={loadingAi}>
                Generate brief
              </button>
            </div>
          </div>
          {aiError ? <p className="error-box">{aiError}</p> : null}
          {aiSummary ? <pre className="ai-output">{aiSummary}</pre> : null}
        </article>
      </section>
    </main>
  );
}
