import { readFile } from "node:fs/promises";
import path from "node:path";

const datasetRoot = path.join(process.cwd(), "Smadex_Creative_Intelligence_Dataset_FULL");

export async function GET(
  _: Request,
  { params }: { params: Promise<{ assetPath: string[] }> },
) {
  const { assetPath } = await params;
  const normalizedPath = path.normalize(assetPath.join("/"));

  if (normalizedPath.startsWith("..") || path.isAbsolute(normalizedPath)) {
    return new Response("Invalid path", { status: 400 });
  }

  try {
    const filePath = path.join(datasetRoot, normalizedPath);
    const buffer = await readFile(filePath);
    return new Response(buffer, {
      headers: {
        "Cache-Control": "public, max-age=86400",
        "Content-Type": "image/png",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
