import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getCountryFlagCode } from "@/lib/utils/countryFlag";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  if (!/^[A-Z]{2}$/.test(code) || getCountryFlagCode(code) !== code) {
    return new Response(null, { status: 404 });
  }
  const svg = await readFile(join(process.cwd(), "node_modules", "country-flag-icons", "3x2", `${code}.svg`));
  return new Response(new Uint8Array(svg), {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
