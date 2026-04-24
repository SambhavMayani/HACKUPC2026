"use client";

import { useMemo, useState } from "react";
import type { CreativeRecord } from "@/lib/sample-data";

type GenerateResponse = {
  creatives?: CreativeRecord[];
  error?: string;
  details?: string;
};

const fatigueTone = {
  low: "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-400/30",
  medium: "bg-amber-500/15 text-amber-100 ring-1 ring-amber-400/30",
  high: "bg-rose-500/15 text-rose-100 ring-1 ring-rose-400/30",
};

export default function Home() {
  const [recordCount, setRecordCount] = useState(24);
  const [campaignCount, setCampaignCount] = useState(5);
  const [creatives, setCreatives] = useState<CreativeRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const summary = useMemo(() => {
    if (!creatives.length) {
      return null;
    }

    const topByRoas = [...creatives].sort((a, b) => b.roas - a.roas).slice(0, 3);
    const repetitiveThemes = Object.entries(
      creatives.reduce<Record<string, number>>((accumulator, creative) => {
        accumulator[creative.theme] = (accumulator[creative.theme] ?? 0) + 1;
        return accumulator;
      }, {}),
    )
      .filter(([, count]) => count > 1)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    const highFatigue = creatives.filter((creative) => creative.fatigue_signal === "high").length;

    return { topByRoas, repetitiveThemes, highFatigue };
  }, [creatives]);

  async function handleGenerate() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/generate-sample-data", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ recordCount, campaignCount }),
      });

      const data = (await response.json()) as GenerateResponse;

      if (!response.ok || !data.creatives) {
        throw new Error(data.details || data.error || "Failed to generate demo dataset.");
      }

      setCreatives(data.creatives);
    } catch (generationError) {
      setCreatives([]);
      setError(generationError instanceof Error ? generationError.message : "Unknown error.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-6 py-12 lg:px-10">
      <section className="grid gap-8 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-8 shadow-2xl shadow-cyan-950/30 backdrop-blur">
          <div className="inline-flex rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-cyan-100">
            Creative Intelligence
          </div>
          <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Generate AI demo data for a mobile advertising intelligence dashboard.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
            This starter app calls the Hack Club AI proxy with <code>google/gemini-3-flash-preview</code> and generates anonymized creatives with realistic performance metrics, repetition patterns, and fatigue signals.
          </p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
          <h2 className="text-lg font-semibold text-white">Generate demo dataset</h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            The generated records are server-side only until validated, so the API key stays off the client.
          </p>

          <div className="mt-6 grid gap-4">
            <label className="grid gap-2 text-sm text-slate-200">
              Number of creatives
              <input
                className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none ring-0"
                type="number"
                min={8}
                max={60}
                value={recordCount}
                onChange={(event) => setRecordCount(Number(event.target.value))}
              />
            </label>

            <label className="grid gap-2 text-sm text-slate-200">
              Number of campaigns
              <input
                className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none ring-0"
                type="number"
                min={2}
                max={10}
                value={campaignCount}
                onChange={(event) => setCampaignCount(Number(event.target.value))}
              />
            </label>

            <button
              className="mt-2 rounded-2xl bg-cyan-400 px-4 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-cyan-950 disabled:text-slate-300"
              type="button"
              onClick={handleGenerate}
              disabled={isLoading}
            >
              {isLoading ? "Generating..." : "Generate example data"}
            </button>
          </div>

          {error ? (
            <p className="mt-4 rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
              {error}
            </p>
          ) : null}
        </div>
      </section>

      {summary ? (
        <section className="grid gap-4 md:grid-cols-3">
          <article className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <p className="text-sm text-slate-400">Top performers</p>
            <div className="mt-3 space-y-3">
              {summary.topByRoas.map((creative) => (
                <div key={creative.creative_id} className="rounded-2xl bg-slate-950/70 p-4">
                  <p className="font-medium text-white">{creative.creative_id}</p>
                  <p className="mt-1 text-sm text-slate-300">{creative.headline}</p>
                  <p className="mt-2 text-sm text-cyan-200">ROAS {creative.roas.toFixed(2)}x</p>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <p className="text-sm text-slate-400">Repetitive themes</p>
            <div className="mt-3 space-y-3">
              {summary.repetitiveThemes.length ? (
                summary.repetitiveThemes.map(([theme, count]) => (
                  <div key={theme} className="rounded-2xl bg-slate-950/70 p-4">
                    <p className="font-medium text-white">{theme}</p>
                    <p className="mt-1 text-sm text-slate-300">{count} creatives share this theme</p>
                  </div>
                ))
              ) : (
                <p className="rounded-2xl bg-slate-950/70 p-4 text-sm text-slate-300">No repeated themes detected in the current sample.</p>
              )}
            </div>
          </article>

          <article className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <p className="text-sm text-slate-400">Fatigue flags</p>
            <div className="mt-3 rounded-2xl bg-slate-950/70 p-4">
              <p className="text-4xl font-semibold text-white">{summary.highFatigue}</p>
              <p className="mt-2 text-sm text-slate-300">Creatives marked with high fatigue for testing refreshes.</p>
            </div>
          </article>
        </section>
      ) : null}

      <section className="rounded-3xl border border-white/10 bg-slate-950/35 p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-white">Generated creatives</h2>
            <p className="mt-1 text-sm text-slate-300">
              Use these records to prototype ranking, repetition detection, fatigue alerts, and next-test recommendations.
            </p>
          </div>
          <p className="text-sm text-slate-400">{creatives.length ? `${creatives.length} records loaded` : "No dataset generated yet"}</p>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {creatives.map((creative) => (
            <article key={creative.creative_id} className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-cyan-200">{creative.campaign_id}</p>
                  <h3 className="mt-1 text-lg font-semibold text-white">{creative.creative_id}</h3>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${fatigueTone[creative.fatigue_signal]}`}>
                  {creative.fatigue_signal} fatigue
                </span>
              </div>

              <p className="mt-4 text-base text-slate-100">{creative.headline}</p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-300">
                <span className="rounded-full bg-white/10 px-3 py-1">{creative.format}</span>
                <span className="rounded-full bg-white/10 px-3 py-1">{creative.theme}</span>
                <span className="rounded-full bg-white/10 px-3 py-1">{creative.visual_style}</span>
              </div>

              <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
                <Metric label="CTR" value={`${(creative.ctr * 100).toFixed(2)}%`} />
                <Metric label="CVR" value={`${(creative.cvr * 100).toFixed(2)}%`} />
                <Metric label="CPI" value={`$${creative.cpi.toFixed(2)}`} />
                <Metric label="ROAS" value={`${creative.roas.toFixed(2)}x`} />
                <Metric label="Spend" value={`$${creative.spend.toFixed(0)}`} />
                <Metric label="Installs" value={creative.installs.toLocaleString()} />
              </dl>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-950/70 p-3">
      <dt className="text-xs uppercase tracking-[0.2em] text-slate-400">{label}</dt>
      <dd className="mt-2 font-medium text-white">{value}</dd>
    </div>
  );
}
