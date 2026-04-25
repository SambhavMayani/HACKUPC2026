import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const cacheDir = path.join(process.cwd(), ".cache", "news");
const defaultQuery = '"mobile app" OR gaming OR ecommerce OR fintech OR travel OR "food delivery" OR entertainment OR advertising';
const verticalQueries: Record<string, string> = {
  ecommerce: 'ecommerce OR retail OR shopping OR "mobile commerce"',
  entertainment: 'entertainment OR streaming OR "mobile entertainment" OR "creator economy"',
  fintech: 'fintech OR banking OR payments OR investing OR "personal finance"',
  food_delivery: '"food delivery" OR restaurant OR delivery OR qcommerce',
  gaming: 'gaming OR "mobile games" OR "live ops" OR esports',
  travel: 'travel OR booking OR hotel OR airline OR tourism',
};

export type NewsArticle = {
  title: string;
  source: string;
  url: string;
  publishedAt: string;
  description: string;
};

export type NewsBrief = {
  query: string;
  fetchedAt: string;
  cacheKey: string;
  articles: NewsArticle[];
};

type NewsApiResponse = {
  status?: string;
  message?: string;
  articles?: Array<{
    title?: string;
    source?: { name?: string };
    url?: string;
    publishedAt?: string;
    description?: string;
  }>;
};

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function fromDate() {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - 30);
  return date.toISOString().slice(0, 10);
}

function slugForQuery(query: string) {
  return query.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 90) || "general";
}

function extractStrings(value: unknown, results = new Set<string>()) {
  if (typeof value === "string") {
    results.add(value);
    return results;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => extractStrings(item, results));
    return results;
  }

  if (value && typeof value === "object") {
    Object.values(value).forEach((item) => extractStrings(item, results));
  }

  return results;
}

function extractVerticals(context: unknown) {
  const verticals = new Set<string>();

  function visit(value: unknown) {
    if (typeof value === "string") {
      if (verticalQueries[value]) {
        verticals.add(value);
      }
      return;
    }

    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }

    if (!value || typeof value !== "object") {
      return;
    }

    const record = value as Record<string, unknown>;
    if (typeof record.vertical === "string" && verticalQueries[record.vertical]) {
      verticals.add(record.vertical);
    }

    if (typeof record.verticals !== "undefined") {
      visit(record.verticals);
    }

    if (record.filters && typeof record.filters === "object") {
      const filterVertical = (record.filters as Record<string, unknown>).vertical;
      if (typeof filterVertical === "string" && verticalQueries[filterVertical]) {
        verticals.add(filterVertical);
      }
    }

    Object.values(record).forEach(visit);
  }

  visit(context);
  return [...verticals];
}

export function buildNewsQuery(question: string, context: unknown) {
  const verticals = extractVerticals(context);
  if (verticals.length === 1) {
    return `(${verticalQueries[verticals[0]]}) AND ("mobile app" OR advertising OR "user acquisition" OR creative)`;
  }

  if (verticals.length > 1) {
    return `(${verticals.map((vertical) => `(${verticalQueries[vertical]})`).join(" OR ")}) AND ("mobile app" OR advertising OR "user acquisition" OR creative)`;
  }

  const text = [question, ...extractStrings(context)].join(" ").toLowerCase();
  const terms = new Set<string>();

  for (const candidate of ["gaming", "ecommerce", "fintech", "travel", "food delivery", "entertainment"]) {
    if (text.includes(candidate)) {
      terms.add(`"${candidate}"`);
    }
  }

  for (const candidate of ["tiktok", "instagram", "ugc", "creator", "ai", "mobile app", "advertising"]) {
    if (text.includes(candidate)) {
      terms.add(`"${candidate}"`);
    }
  }

  if (terms.size === 0) {
    return defaultQuery;
  }

  terms.add('"mobile app"');
  terms.add("advertising");
  return [...terms].join(" OR ");
}

export async function getDailyNewsBrief(query: string): Promise<NewsBrief> {
  const apiKey = process.env.NEWS_API_KEY;

  if (!apiKey) {
    throw new Error("Missing NEWS_API_KEY. Add it to .env.local to enable current news.");
  }

  const normalizedQuery = query.trim() || defaultQuery;
  const cacheKey = `${todayKey()}-${slugForQuery(normalizedQuery)}`;
  const cacheFile = path.join(cacheDir, `${cacheKey}.json`);

  try {
    const cached = await readFile(cacheFile, "utf8");
    return JSON.parse(cached) as NewsBrief;
  } catch {
    // Cache miss or malformed cache: fetch fresh news below.
  }

  const url = new URL("https://newsapi.org/v2/everything");
  url.searchParams.set("q", normalizedQuery);
  url.searchParams.set("from", fromDate());
  url.searchParams.set("sortBy", "popularity");
  url.searchParams.set("language", "en");
  url.searchParams.set("pageSize", "8");
  url.searchParams.set("apiKey", apiKey);

  const response = await fetch(url, { next: { revalidate: 86400 } });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`News request failed: ${response.status} ${errorText}`);
  }

  const payload = (await response.json()) as NewsApiResponse;
  if (payload.status === "error") {
    throw new Error(payload.message ?? "News API returned an error.");
  }

  const articles = (payload.articles ?? [])
    .filter((article) => article.title && article.url)
    .slice(0, 8)
    .map((article) => ({
      title: article.title ?? "",
      source: article.source?.name ?? "Unknown source",
      url: article.url ?? "",
      publishedAt: article.publishedAt ?? "",
      description: article.description ?? "",
    }));

  const brief: NewsBrief = {
    query: normalizedQuery,
    fetchedAt: new Date().toISOString(),
    cacheKey,
    articles,
  };

  await mkdir(cacheDir, { recursive: true });
  await writeFile(cacheFile, JSON.stringify(brief, null, 2));

  return brief;
}
