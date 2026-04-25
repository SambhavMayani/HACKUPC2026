import { NextResponse } from "next/server";

type CopilotBody = {
  question?: string;
  context?: unknown;
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

  const prompt = [
    "You are an explainable creative strategist for mobile advertising.",
    "Use only the provided dashboard context. Write for a non-technical marketer.",
    "Keep it concise, concrete, and action-oriented. Do not invent creatives or metrics.",
    "Return Markdown with short bullets under these headings: Winning signals, Risks, Next actions.",
    `User question: ${question}`,
    "Dashboard context:",
    JSON.stringify(body.context, null, 2),
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
