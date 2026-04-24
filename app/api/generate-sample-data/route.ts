import { NextResponse } from "next/server";
import { extractJsonArray, normalizeGeneratedDataset } from "@/lib/sample-data";

const API_URL = "https://ai.hackclub.com/proxy/v1/chat/completions";
const MODEL = "google/gemini-3-flash-preview";

function buildPrompt(recordCount: number, campaignCount: number) {
  return [
    `Generate ${recordCount} anonymized mobile advertising creatives across ${campaignCount} campaigns.`,
    "Return valid JSON only as an array with no commentary.",
    "Every object must include exactly these fields:",
    "creative_id, campaign_id, format, theme, headline, cta_style, visual_style, audience_hint, impressions, clicks, installs, spend, ctr, cvr, cpi, roas, fatigue_signal.",
    "Rules:",
    "- format must be one of: static, video, playable, carousel.",
    "- fatigue_signal must be one of: low, medium, high.",
    "- Keep all names anonymized and brand-neutral.",
    "- Use realistic performance metrics for mobile app install campaigns.",
    "- Ensure 3 to 5 creatives are clear top performers.",
    "- Ensure 2 to 3 repetitive theme clusters appear across the dataset.",
    "- Ensure several fatigued underperformers exist with high fatigue_signal.",
    "- impressions, clicks, installs are integers.",
    "- spend, ctr, cvr, cpi, roas are numbers.",
    "- Keep ctr as a decimal percentage representation like 0.0182 for 1.82%.",
    "- Keep cvr as installs/clicks style decimal ratio.",
    "- Keep cpi as spend/install.",
    "- Keep roas as decimal multiplier.",
    "- Make the dataset diverse enough to answer: which creatives are best, which look repetitive or tired, and what to test next.",
  ].join("\n");
}

export async function POST(request: Request) {
  const apiKey = process.env.HACKCLUB_AI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing HACKCLUB_AI_API_KEY in the server environment." },
      { status: 500 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    recordCount?: number;
    campaignCount?: number;
  };

  const recordCount = clamp(body.recordCount ?? 24, 8, 60);
  const campaignCount = clamp(body.campaignCount ?? 5, 2, 10);

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.7,
      max_tokens: 2400,
      messages: [
        {
          role: "system",
          content:
            "You generate synthetic but realistic ad performance datasets for demo dashboards. Return compact, valid JSON only.",
        },
        {
          role: "user",
          content: buildPrompt(recordCount, campaignCount),
        },
      ],
    }),
  });

  if (!response.ok) {
    const failureText = await response.text();
    return NextResponse.json(
      { error: "The AI provider request failed.", details: failureText },
      { status: 502 },
    );
  }

  const result = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = result.choices?.[0]?.message?.content;

  if (!content) {
    return NextResponse.json({ error: "The AI response was empty." }, { status: 502 });
  }

  try {
    const parsed = JSON.parse(extractJsonArray(content));
    const creatives = normalizeGeneratedDataset(parsed);
    return NextResponse.json({ creatives });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown parsing error.";
    return NextResponse.json(
      { error: "The AI response could not be parsed into demo creatives.", details: message },
      { status: 502 },
    );
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(Math.round(value), min), max);
}
