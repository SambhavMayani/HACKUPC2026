import type { CreativeRecord } from "@/lib/sample-data";

export type ScoredCreative = CreativeRecord & {
  overall_score: number;
  efficiency_score: number;
  engagement_score: number;
};

export type RepetitionCluster = {
  signature: string;
  theme: string;
  visual_style: string;
  cta_style: string;
  creatives: ScoredCreative[];
  average_roas: number;
  average_ctr: number;
  fatigue_ratio: number;
};

export type TestOpportunity = {
  title: string;
  rationale: string;
  based_on: string[];
  priority: "high" | "medium";
};

export type CreativeAnalysis = {
  scoredCreatives: ScoredCreative[];
  topPerformers: ScoredCreative[];
  tiredCreatives: ScoredCreative[];
  repetitionClusters: RepetitionCluster[];
  testOpportunities: TestOpportunity[];
  metrics: {
    averageRoas: number;
    averageCtr: number;
    averageCvr: number;
    totalSpend: number;
    totalInstalls: number;
  };
};

export function analyzeCreatives(creatives: CreativeRecord[]): CreativeAnalysis {
  if (!creatives.length) {
    return {
      scoredCreatives: [],
      topPerformers: [],
      tiredCreatives: [],
      repetitionClusters: [],
      testOpportunities: [],
      metrics: {
        averageRoas: 0,
        averageCtr: 0,
        averageCvr: 0,
        totalSpend: 0,
        totalInstalls: 0,
      },
    };
  }

  const maxima = {
    ctr: Math.max(...creatives.map((creative) => creative.ctr), 0.0001),
    cvr: Math.max(...creatives.map((creative) => creative.cvr), 0.0001),
    roas: Math.max(...creatives.map((creative) => creative.roas), 0.0001),
    installs: Math.max(...creatives.map((creative) => creative.installs), 1),
    inverseCpi: Math.max(...creatives.map((creative) => 1 / Math.max(creative.cpi, 0.01))),
  };

  const scoredCreatives = creatives
    .map((creative) => scoreCreative(creative, maxima))
    .sort((left, right) => right.overall_score - left.overall_score);

  const averages = computeAverages(creatives);
  const repetitionClusters = buildRepetitionClusters(scoredCreatives);
  const tiredCreatives = scoredCreatives
    .filter(
      (creative) =>
        creative.fatigue_signal === "high" ||
        (creative.fatigue_signal === "medium" && creative.roas < averages.averageRoas && creative.ctr < averages.averageCtr),
    )
    .sort((left, right) => {
      const fatigueGap = fatigueWeight(right.fatigue_signal) - fatigueWeight(left.fatigue_signal);
      if (fatigueGap !== 0) {
        return fatigueGap;
      }

      return left.overall_score - right.overall_score;
    })
    .slice(0, 6);

  return {
    scoredCreatives,
    topPerformers: scoredCreatives.slice(0, 5),
    tiredCreatives,
    repetitionClusters,
    testOpportunities: buildTestOpportunities(scoredCreatives, repetitionClusters),
    metrics: averages,
  };
}

function scoreCreative(
  creative: CreativeRecord,
  maxima: { ctr: number; cvr: number; roas: number; installs: number; inverseCpi: number },
): ScoredCreative {
  const engagement_score = clamp01(creative.ctr / maxima.ctr) * 0.55 + clamp01(creative.clicks / Math.max(creative.impressions, 1)) * 0.45;
  const efficiency_score =
    clamp01(creative.roas / maxima.roas) * 0.5 +
    clamp01(creative.cvr / maxima.cvr) * 0.25 +
    clamp01((1 / Math.max(creative.cpi, 0.01)) / maxima.inverseCpi) * 0.25;
  const scale_score = clamp01(creative.installs / maxima.installs);
  const fatigue_penalty = creative.fatigue_signal === "high" ? 0.1 : creative.fatigue_signal === "medium" ? 0.04 : 0;
  const overall_score = Number(
    Math.max(0, (engagement_score * 0.3 + efficiency_score * 0.55 + scale_score * 0.15 - fatigue_penalty) * 100).toFixed(1),
  );

  return {
    ...creative,
    overall_score,
    efficiency_score: Number((efficiency_score * 100).toFixed(1)),
    engagement_score: Number((engagement_score * 100).toFixed(1)),
  };
}

function computeAverages(creatives: CreativeRecord[]) {
  const totalSpend = creatives.reduce((sum, creative) => sum + creative.spend, 0);
  const totalInstalls = creatives.reduce((sum, creative) => sum + creative.installs, 0);

  return {
    averageRoas: mean(creatives.map((creative) => creative.roas)),
    averageCtr: mean(creatives.map((creative) => creative.ctr)),
    averageCvr: mean(creatives.map((creative) => creative.cvr)),
    totalSpend: Number(totalSpend.toFixed(2)),
    totalInstalls,
  };
}

function buildRepetitionClusters(creatives: ScoredCreative[]): RepetitionCluster[] {
  const grouped = creatives.reduce<Map<string, ScoredCreative[]>>((clusters, creative) => {
    const signature = createSignature(creative);
    const existing = clusters.get(signature) ?? [];
    existing.push(creative);
    clusters.set(signature, existing);
    return clusters;
  }, new Map());

  return [...grouped.entries()]
    .filter(([, items]) => items.length > 1)
    .map(([signature, items]) => ({
      signature,
      theme: items[0].theme,
      visual_style: items[0].visual_style,
      cta_style: items[0].cta_style,
      creatives: [...items].sort((left, right) => right.overall_score - left.overall_score),
      average_roas: mean(items.map((item) => item.roas)),
      average_ctr: mean(items.map((item) => item.ctr)),
      fatigue_ratio: Number((items.filter((item) => item.fatigue_signal !== "low").length / items.length).toFixed(2)),
    }))
    .sort((left, right) => {
      if (right.creatives.length !== left.creatives.length) {
        return right.creatives.length - left.creatives.length;
      }

      return right.fatigue_ratio - left.fatigue_ratio;
    })
    .slice(0, 6);
}

function buildTestOpportunities(creatives: ScoredCreative[], clusters: RepetitionCluster[]): TestOpportunity[] {
  const winners = creatives.slice(0, 3);
  const weakestRepeatedCluster = clusters
    .filter((cluster) => cluster.fatigue_ratio >= 0.5 || cluster.average_roas < mean(creatives.map((creative) => creative.roas)))
    .sort((left, right) => left.average_roas - right.average_roas)[0];
  const bestFormat = summarizeTopDimension(winners, "format");
  const bestAudience = summarizeTopDimension(winners, "audience_hint");

  const ideas: TestOpportunity[] = [];

  if (weakestRepeatedCluster) {
    ideas.push({
      title: `Refresh the ${weakestRepeatedCluster.theme} cluster`,
      rationale: `This repeated pattern appears ${weakestRepeatedCluster.creatives.length} times with ${Math.round(weakestRepeatedCluster.fatigue_ratio * 100)}% fatigue and only ${weakestRepeatedCluster.average_roas.toFixed(2)}x average ROAS.`,
      based_on: weakestRepeatedCluster.creatives.map((creative) => creative.creative_id),
      priority: "high",
    });
  }

  if (bestFormat) {
    ideas.push({
      title: `Scale a new ${bestFormat.value} concept`,
      rationale: `${bestFormat.value} appears most often among the current top performers, suggesting format is part of the win pattern.`,
      based_on: winners.map((creative) => creative.creative_id),
      priority: "high",
    });
  }

  if (bestAudience) {
    ideas.push({
      title: `Create a sharper variant for ${bestAudience.value}`,
      rationale: `Top creatives keep resonating with this audience hint, but the current pool still leaves room to diversify the angle and CTA.`,
      based_on: winners.map((creative) => creative.creative_id),
      priority: "medium",
    });
  }

  return ideas.slice(0, 3);
}

function summarizeTopDimension<T extends keyof Pick<ScoredCreative, "format" | "audience_hint">>(
  creatives: ScoredCreative[],
  key: T,
) {
  const counts = creatives.reduce<Map<string, number>>((accumulator, creative) => {
    const value = creative[key];
    accumulator.set(value, (accumulator.get(value) ?? 0) + 1);
    return accumulator;
  }, new Map());

  const top = [...counts.entries()].sort((left, right) => right[1] - left[1])[0];
  return top ? { value: top[0], count: top[1] } : null;
}

function createSignature(creative: CreativeRecord) {
  return [creative.theme, creative.visual_style, creative.cta_style].join(" | ");
}

function fatigueWeight(signal: CreativeRecord["fatigue_signal"]) {
  if (signal === "high") {
    return 3;
  }

  if (signal === "medium") {
    return 2;
  }

  return 1;
}

function mean(values: number[]) {
  if (!values.length) {
    return 0;
  }

  return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(4));
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}
