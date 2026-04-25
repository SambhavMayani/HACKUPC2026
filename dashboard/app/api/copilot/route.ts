import { NextResponse } from "next/server";
import { buildNewsQuery, getDailyNewsBrief } from "@/lib/news-cache";

type CopilotBody = {
  question?: string;
  context?: unknown;
  includeNews?: boolean;
  newsQuery?: string;
};

export async function POST(request: Request) {
  const apiKey = process.env.HACKCLUB_AI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing HACKCLUB_AI_API_KEY. Add it to .env.local and restart the dev server." },
      { status: 500 },
    );
  }

  const body = (await request.json()) as CopilotBody;
  const question = body.question?.trim() || "Explain the selected creative performance slice.";
  const news = body.includeNews
    ? await getDailyNewsBrief(body.newsQuery?.trim() || buildNewsQuery(question, body.context))
    : null;

  const prompt = [
    "You are an explainable creative strategist for mobile advertising.",
    "Use only the provided dashboard context. Write for a non-technical marketer.",
    "Hard scope rule: only discuss advertisers, campaign IDs, creative IDs, and headlines present in dashboardContext.allowedScope.",
    "If the user asks about or implies an ID outside allowedScope, say it is not available in the current filtered slice and do not analyze it.",
    "Do not mention any campaign or creative ID unless it appears in allowedScope. Never pull IDs from memory, examples, hidden data, or news.",
    "When referencing entities, use these exact clickable-friendly forms: Creative 500147, Creative IDs 500147 and 500794, Campaign 20096, or Campaigns 20096 and 20060.",
    "Do not write IDs without the Creative or Campaign label.",
    news
      ? "You also have current news context. Use it only for trend-aware test ideas and clearly separate it from dataset evidence."
      : "No current news context was requested. Do not speculate about external trends.",
    "Keep it concise, concrete, and action-oriented. Do not invent creatives or metrics.",
    news
      ? "Return Markdown with short bullets under these headings: Winning signals, Risks, Trend-aware next actions."
      : "Return Markdown with short bullets under these headings: Winning signals, Risks, Next actions.",
    `User question: ${question}`,
    "Dashboard context:",
    JSON.stringify(body.context, null, 2),
    news ? "Current news context:" : "",
    news ? JSON.stringify(news, null, 2) : "",
  ].join("\n\n");

  const response = await fetch("https://ai.hackclub.com/proxy/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.HACKCLUB_AI_MODEL ?? "google/gemini-3-flash-preview",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.35,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    return NextResponse.json(
      { error: `AI request failed: ${response.status} ${errorText}` },
      { status: 500 },
    );
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = payload.choices?.[0]?.message?.content?.trim();

  if (!content) {
    return NextResponse.json({ error: "AI returned an empty response." }, { status: 500 });
  }

  return NextResponse.json({ content });
}
