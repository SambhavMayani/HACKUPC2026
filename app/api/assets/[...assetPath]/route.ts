import { readFile } from "node:fs/promises";
import path from "node:path";

const datasetRoot = path.join(process.cwd(), "Smadex_Creative_Intelligence_Dataset_FULL");

export async function GET(
  _: Request,
  { params }: { params: Promise<{ assetPath: string[] }> },
) {
  const { assetPath } = await params;
  const normalizedPath = path.normalize(assetPath.join("/"));

  if (normalizedPath.startsWith("..")) {
    return new Response("Invalid path", { status: 400 });
  }

  const filePath = path.join(datasetRoot, normalizedPath);

  try {
    const buffer = await readFile(filePath);
    return new Response(buffer, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
