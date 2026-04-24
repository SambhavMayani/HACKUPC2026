"use client";

import { useMemo, useState } from "react";
import type { DashboardData, MarketInsight } from "@/lib/creative-intelligence";

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

export function Dashboard({ data }: DashboardProps) {
  const [filters, setFilters] = useState<Filters>({
    advertiser: "All",
    campaignId: "All",
    country: "All",
    os: "All",
    format: "All",
  });
  const [aiSummary, setAiSummary] = useState<string>("");
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

  async function generateAiSummary() {
    setLoadingAi(true);
    setAiError("");

    try {
      const response = await fetch("/api/recommend", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(market.key),
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
          <h1>Creative decisions, not just creative data.</h1>
          <p>
            This copilot ranks winners, flags fatigue, spots repetition, and turns the dataset into
            clear next-test recommendations a marketer can act on.
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
          <span>Answer 1</span>
          <h2>Which creatives are working best?</h2>
          <p>{market.narrative.bestSummary}</p>
        </article>
        <article className="summary-card amber">
          <span>Answer 2</span>
          <h2>Which creatives look repetitive or tired?</h2>
          <p>{market.narrative.riskSummary}</p>
        </article>
        <article className="summary-card emerald">
          <span>Answer 3</span>
          <h2>What should we test next?</h2>
          <p>{market.narrative.nextTestSummary}</p>
        </article>
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
          {market.topCreatives.map((creative) => (
            <CreativeCard key={`${creative.creativeId}-${creative.country}-${creative.os}`} creative={creative} />
          ))}
        </div>
      </section>

      <section className="split-section">
        <div>
          <div className="section-heading">
            <span className="eyebrow">Fatigue detection</span>
            <h2>Creatives starting to wear out</h2>
          </div>
          <div className="risk-grid">
            {market.fatiguedCreatives.map((item) => (
              <RiskCard key={`fatigue-${item.creativeId}`} item={item} title="Tired" tone="amber" />
            ))}
          </div>
        </div>
        <div>
          <div className="section-heading">
            <span className="eyebrow">Similarity clustering</span>
            <h2>Creatives that feel repetitive</h2>
          </div>
          <div className="risk-grid">
            {market.repetitiveCreatives.map((item) => (
              <RiskCard key={`repeat-${item.creativeId}`} item={item} title="Repetitive" tone="violet" />
            ))}
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
            <h2>Explain this slice with Gemini</h2>
          </div>
          <p>
            Uses the Hack Club proxy with <code>google/gemini-3-flash-preview</code> to turn the
            current filtered market into a marketer-ready brief.
          </p>
          <button type="button" onClick={generateAiSummary} disabled={loadingAi}>
            {loadingAi ? "Generating brief..." : "Generate AI brief"}
          </button>
          {aiError ? <p className="error-box">{aiError}</p> : null}
          {aiSummary ? <pre className="ai-output">{aiSummary}</pre> : null}
        </article>
      </section>
    </main>
  );
}
