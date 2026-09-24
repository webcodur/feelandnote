import sharp from "sharp";
import { MYTH_TITLE_DISPLAY } from "@feelandnote/shared/constants/responsive-artwork";

export const runtime = "nodejs";

const cache = new Map<string, Promise<Buffer>>();

function resizedImage(file: string, width: number) {
  const key = `${file}:${width}`;
  const existing = cache.get(key);
  if (existing) return existing;

  const base = process.env.R2_PUBLIC_URL || process.env.NEXT_PUBLIC_R2_PUBLIC_URL;
  if (!base) throw new Error("R2 public URL is missing");
  const result = fetch(`${base.replace(/\/$/, "")}/myth/title-art/${file}`).then(async (response) => {
    if (!response.ok) throw Object.assign(new Error(`R2 returned ${response.status}`), { status: response.status });
    return sharp(Buffer.from(await response.arrayBuffer()))
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: MYTH_TITLE_DISPLAY.quality })
      .toBuffer();
  });
  cache.set(key, result);
  if (cache.size > 128) cache.delete(cache.keys().next().value!);
  result.catch(() => { if (cache.get(key) === result) cache.delete(key); });
  return result;
}

export async function GET(request: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const url = new URL(request.url);
  const width = Number(url.searchParams.get("w"));
  if (!/^[a-z0-9][a-z0-9-]*-[a-f0-9]{12}\.png$/.test(file) || !(MYTH_TITLE_DISPLAY.widths as readonly number[]).includes(width)) {
    return new Response(null, { status: 400 });
  }

  try {
    const image = await resizedImage(file, width);
    return new Response(new Uint8Array(image), {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    if ((error as { status?: number }).status === 404) return new Response(null, { status: 404 });
    console.error("Myth title image failed", file, error);
    return new Response(null, { status: 500 });
  }
}
