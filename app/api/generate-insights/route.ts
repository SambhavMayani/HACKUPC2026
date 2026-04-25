import { NextResponse } from "next/server";
import { analyzeCreatives } from "@/lib/creative-intelligence";
import { extractJsonObject, normalizeGeneratedDataset } from "@/lib/sample-data";

const API_URL = "https://ai.hackclub.com/proxy/v1/chat/completions";
const MODEL = "google/gemini-3-flash-preview";

type InsightResponse = {
  winnerNarrative: string;
  fatigueNarrative: string;
  testIdeas: Array<{
    title: string;
    hypothesis: string;
    whyNow: string;
    priority: "high" | "medium";
  }>;
};

export async function POST(request: Request) {
  const apiKey = process.env.HACKCLUB_AI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing HACKCLUB_AI_API_KEY in the server environment." },
      { status: 500 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as { creatives?: unknown };

  try {
    const creatives = normalizeGeneratedDataset(body.creatives);
    const analysis = analyzeCreatives(creatives);

    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.5,
        max_tokens: 1800,
        messages: [
          {
            role: "system",
            content:
              "You are a mobile ad creative strategist. Return valid JSON only. Keep recommendations concrete, concise, and tied to evidence from the dataset.",
          },
          {
            role: "user",
            content: buildInsightsPrompt(analysis),
          },
        ],
      }),
    });

    if (!response.ok) {
      const details = await response.text();
      return NextResponse.json({ error: "The AI provider request failed.", details }, { status: 502 });
    }

    const result = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = result.choices?.[0]?.message?.content;

    if (!content) {
      return NextResponse.json({ error: "The AI response was empty." }, { status: 502 });
    }

    const insights = normalizeInsights(JSON.parse(extractJsonObject(content)));
    return NextResponse.json({ insights });
  } catch (error) {
    const details = error instanceof Error ? error.message : "Unknown error.";
    return NextResponse.json({ error: "Could not generate insights.", details }, { status: 400 });
  }
}

function buildInsightsPrompt(analysis: ReturnType<typeof analyzeCreatives>) {
  return [
    "You are helping a marketer answer three questions: which creatives are working best, which look repetitive or tired, and what should we test next.",
    "Return a JSON object with exactly these fields:",
    "winnerNarrative, fatigueNarrative, testIdeas.",
    "testIdeas must be an array of exactly 3 objects with fields: title, hypothesis, whyNow, priority.",
    "priority must be high or medium.",
    "Use the following evidence:",
    JSON.stringify(
      {
        topPerformers: analysis.topPerformers.map((creative) => ({
          creative_id: creative.creative_id,
          theme: creative.theme,
          format: creative.format,
          audience_hint: creative.audience_hint,
          headline: creative.headline,
          roas: creative.roas,
          ctr: creative.ctr,
          cvr: creative.cvr,
          overall_score: creative.overall_score,
        })),
        tiredCreatives: analysis.tiredCreatives.map((creative) => ({
          creative_id: creative.creative_id,
          theme: creative.theme,
          visual_style: creative.visual_style,
          cta_style: creative.cta_style,
          fatigue_signal: creative.fatigue_signal,
          roas: creative.roas,
          ctr: creative.ctr,
          overall_score: creative.overall_score,
        })),
        repetitionClusters: analysis.repetitionClusters.map((cluster) => ({
          theme: cluster.theme,
          visual_style: cluster.visual_style,
          cta_style: cluster.cta_style,
          count: cluster.creatives.length,
          average_roas: cluster.average_roas,
          fatigue_ratio: cluster.fatigue_ratio,
        })),
        deterministicTestOpportunities: analysis.testOpportunities,
        summaryMetrics: analysis.metrics,
      },
      null,
      2,
    ),
    "Keep each narrative under 90 words and each test idea highly actionable.",
  ].join("\n");
}

function normalizeInsights(value: unknown): InsightResponse {
  if (!value || typeof value !== "object") {
    throw new Error("Insights payload is invalid.");
  }

  const candidate = value as Partial<InsightResponse>;

  if (typeof candidate.winnerNarrative !== "string" || typeof candidate.fatigueNarrative !== "string") {
    throw new Error("Insights narratives are missing.");
  }

  if (!Array.isArray(candidate.testIdeas) || candidate.testIdeas.length !== 3) {
    throw new Error("Insights test ideas are invalid.");
  }

  const testIdeas = candidate.testIdeas.map((idea, index) => {
    if (!idea || typeof idea !== "object") {
      throw new Error(`Test idea ${index} is invalid.`);
    }

    const typedIdea = idea as InsightResponse["testIdeas"][number];

    if (
      typeof typedIdea.title !== "string" ||
      typeof typedIdea.hypothesis !== "string" ||
      typeof typedIdea.whyNow !== "string" ||
      (typedIdea.priority !== "high" && typedIdea.priority !== "medium")
    ) {
      throw new Error(`Test idea ${index} is malformed.`);
    }

    return typedIdea;
  });

  return {
    winnerNarrative: candidate.winnerNarrative,
    fatigueNarrative: candidate.fatigueNarrative,
    testIdeas,
  };
}
