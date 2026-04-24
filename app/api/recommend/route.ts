import { NextResponse } from "next/server";
import { getDashboardData } from "@/lib/creative-intelligence";

type RequestBody = {
  advertiser: string;
  campaignId: string;
  country: string;
  os: string;
  format: string;
};

export async function POST(request: Request) {
  const apiKey = process.env.HACKCLUB_AI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing HACKCLUB_AI_API_KEY in environment." },
      { status: 500 },
    );
  }

  const body = (await request.json()) as RequestBody;
  const data = await getDashboardData();
  const market = data.markets.find(
    (entry) =>
      entry.key.advertiser === body.advertiser &&
      entry.key.campaignId === body.campaignId &&
      entry.key.country === body.country &&
      entry.key.os === body.os &&
      entry.key.format === body.format,
  );

  if (!market) {
    return NextResponse.json({ error: "No matching market slice found." }, { status: 404 });
  }

  const prompt = [
    "You are an explainable creative strategist for mobile advertising.",
    "You will receive a summarized market slice. Return a crisp marketer-ready answer in plain English.",
    "Format exactly as Markdown with these sections:",
    "## What is winning",
    "## What feels repetitive or tired",
    "## What to test next",
    "Each section must have 2-4 bullets. Keep the advice specific and tied to the evidence.",
    "Do not mention missing data or caveats unless absolutely necessary.",
    "Here is the data:",
    JSON.stringify(market, null, 2),
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
      temperature: 0.4,
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
