import { NextRequest } from "next/server";
import { isReadingTiming } from "@/lib/reading-timing";
import { getReadingVoiceUrl, getVirtualMonologueVoiceUrl } from "@/lib/game/voice/voiceUrl";

// The public asset host does not expose CORS headers. Only proxy these fixed asset paths.
const KIND_URL: Record<string, (id: string, locale: "ko" | "en", v: number) => string> = {
  reading: getReadingVoiceUrl,
  monologue: getVirtualMonologueVoiceUrl,
};
const KIND_STEM: Record<string, string> = { reading: "reading", monologue: "vmonologue" };

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams;
  const id = query.get("id") ?? "";
  const locale = query.get("locale");
  const version = query.get("v") ?? "0";
  const kind = query.get("kind") ?? "reading";
  const stem = KIND_STEM[kind];
  if (!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(id)
    || (locale !== "ko" && locale !== "en") || !/^\d{1,10}$/.test(version)
    || !Object.hasOwn(KIND_STEM, kind)) {
    return new Response(null, { status: 400 });
  }
  const missing = () => new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  const audioUrl = KIND_URL[kind](id, locale, Number(version));
  if (!audioUrl) return missing();
  try {
    const signal = AbortSignal.timeout(8000);
    const [json, audio] = await Promise.all([
      fetch(audioUrl.replace(`/${stem}.mp3`, `/${stem}.json`), { cache: "no-store", signal }),
      fetch(audioUrl, { method: "HEAD", cache: "no-store", signal }),
    ]);
    if (!json.ok || !audio.ok || Number(json.headers.get("content-length")) > 128_000) return missing();
    const body = await json.text();
    if (body.length > 128_000) return missing();
    const data: unknown = JSON.parse(body);
    if (!isReadingTiming(data) || audio.headers.get("etag") !== data.audioEtag) return missing();
    return Response.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return missing();
  }
}
