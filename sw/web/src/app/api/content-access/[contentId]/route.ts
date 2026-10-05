import { ACCESS_SOURCES, steamAccessAppId, type AccessSource, type AccessStreamEvent } from '@/lib/commerce/contentAccess'
import { streamContentAccess } from '@/lib/commerce/contentAccessServer'
import { accessCountry } from '@/lib/commerce/mediaAccess'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request, { params }: { params: Promise<{ contentId: string }> }) {
  const { contentId } = await params
  const requested = new URL(request.url).searchParams.get('sources')?.split(',') ?? []
  const valid = new Set<string>(Object.values(ACCESS_SOURCES).flat())
  if ((!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(contentId) && !steamAccessAppId(contentId))
    || !requested.length || requested.length > valid.size || requested.some(source => !valid.has(source))) {
    return Response.json({ error: 'Invalid access request' }, { status: 400 })
  }
  const sources = [...new Set(requested)] as AccessSource[]
  const controller = new AbortController()
  const signal = AbortSignal.any([request.signal, controller.signal])
  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    start(output) {
      const emit = (event: AccessStreamEvent) => {
        if (!signal.aborted) output.enqueue(encoder.encode(`${JSON.stringify(event)}\n`))
      }
      void streamContentAccess(contentId, sources, emit, signal, accessCountry(request.headers.get('CF-IPCountry')))
        .catch(() => { sources.forEach(source => emit({ kind: 'error', source })) })
        .finally(() => { if (!signal.aborted) output.close() })
    },
    cancel() { controller.abort() },
  })
  return new Response(stream, { headers: {
    'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'private, no-store, no-transform',
    'X-Accel-Buffering': 'no', 'X-Robots-Tag': 'noindex, nofollow',
  } })
}
