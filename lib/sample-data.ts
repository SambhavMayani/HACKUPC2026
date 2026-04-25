export type CreativeRecord = {
  creative_id: string;
  campaign_id: string;
  format: "static" | "video" | "playable" | "carousel";
  theme: string;
  headline: string;
  cta_style: string;
  visual_style: string;
  audience_hint: string;
  impressions: number;
  clicks: number;
  installs: number;
  spend: number;
  ctr: number;
  cvr: number;
  cpi: number;
  roas: number;
  fatigue_signal: "low" | "medium" | "high";
};

type CreativeRecordLike = Partial<CreativeRecord> & Record<string, unknown>;

const FORMATS = new Set(["static", "video", "playable", "carousel"]);
const FATIGUE_SIGNALS = new Set(["low", "medium", "high"]);

function isPositiveInteger(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isPositiveNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

export function normalizeGeneratedDataset(payload: unknown): CreativeRecord[] {
  if (!Array.isArray(payload)) {
    throw new Error("Generated payload must be an array of creatives.");
  }

  return payload.map((item, index) => normalizeCreative(item, index));
}

function normalizeCreative(item: CreativeRecordLike, index: number): CreativeRecord {
  if (!item || typeof item !== "object") {
    throw new Error(`Creative at index ${index} is not an object.`);
  }

  const creative = {
    creative_id: readString(item.creative_id, index, "creative_id"),
    campaign_id: readString(item.campaign_id, index, "campaign_id"),
    format: readEnum(item.format, index, "format", FORMATS) as CreativeRecord["format"],
    theme: readString(item.theme, index, "theme"),
    headline: readString(item.headline, index, "headline"),
    cta_style: readString(item.cta_style, index, "cta_style"),
    visual_style: readString(item.visual_style, index, "visual_style"),
    audience_hint: readString(item.audience_hint, index, "audience_hint"),
    impressions: readInteger(item.impressions, index, "impressions"),
    clicks: readInteger(item.clicks, index, "clicks"),
    installs: readInteger(item.installs, index, "installs"),
    spend: readNumber(item.spend, index, "spend"),
    ctr: readNumber(item.ctr, index, "ctr"),
    cvr: readNumber(item.cvr, index, "cvr"),
    cpi: readNumber(item.cpi, index, "cpi"),
    roas: readNumber(item.roas, index, "roas"),
    fatigue_signal: readEnum(item.fatigue_signal, index, "fatigue_signal", FATIGUE_SIGNALS) as CreativeRecord["fatigue_signal"],
  } satisfies CreativeRecord;

  return creative;
}

function readString(value: unknown, index: number, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Creative ${index} has an invalid ${field}.`);
  }

  return value.trim();
}

function readEnum(value: unknown, index: number, field: string, options: Set<string>): string {
  if (typeof value !== "string" || !options.has(value)) {
    throw new Error(`Creative ${index} has an invalid ${field}.`);
  }

  return value;
}

function readInteger(value: unknown, index: number, field: string): number {
  if (!isPositiveInteger(value)) {
    throw new Error(`Creative ${index} has an invalid ${field}.`);
  }

  return Number(value);
}

function readNumber(value: unknown, index: number, field: string): number {
  if (!isPositiveNumber(value)) {
    throw new Error(`Creative ${index} has an invalid ${field}.`);
  }

  return Number(Number(value).toFixed(4));
}

export function extractJsonArray(content: string) {
  const fencedMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fencedMatch?.[1] ?? content;
  const start = candidate.indexOf("[");
  const end = candidate.lastIndexOf("]");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Model did not return a JSON array.");
  }

  return candidate.slice(start, end + 1);
}

export function extractJsonObject(content: string) {
  const fencedMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fencedMatch?.[1] ?? content;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Model did not return a JSON object.");
  }

  return candidate.slice(start, end + 1);
}
