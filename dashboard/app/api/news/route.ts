import { NextResponse } from "next/server";
import { getDailyNewsBrief } from "@/lib/news-cache";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") ?? "";

  try {
    const news = await getDailyNewsBrief(query);
    return NextResponse.json(news);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown news error" },
      { status: 500 },
    );
  }
}
