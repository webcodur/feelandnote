import type { NextRequest } from 'next/server'
import { getTranslations } from 'next-intl/server'
import { getCuratedListDownload } from '@/actions/library/curated'
import { createCuratedListCsv, curatedListCsvFilename } from '@/lib/library/curatedListCsv'
import { isLocale } from '@/types/locale'

export async function GET(request: NextRequest, { params }: { params: Promise<{ curator: string; list: string }> }) {
  const locale = request.nextUrl.searchParams.get('locale') ?? 'ko'
  if (!isLocale(locale)) return Response.json({ error: 'Invalid locale' }, { status: 400 })
  const { curator, list: slug } = await params

  try {
    const list = await getCuratedListDownload(curator, slug, locale)
    if (!list) return Response.json({ error: 'List not found' }, { status: 404 })
    const t = await getTranslations({ locale, namespace: 'library.curated.downloadColumns' })
    const csv = createCuratedListCsv(list, { number: t('number'), title: t('title'), creator: t('creator'),
      rank: t('rank'), year: t('year'), note: t('note'), curator: t('curator'), list: t('list'), source: t('source') })
    const filename = encodeURIComponent(curatedListCsvFilename(list.title)).replace(/['()*]/g, char => `%${char.charCodeAt(0).toString(16).toUpperCase()}`)
    return new Response(csv, { headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="curated-list.csv"; filename*=UTF-8''${filename}`,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    } })
  } catch (error) {
    console.error('[curated-list-download] 목록 다운로드 실패:', error)
    return Response.json({ error: 'List download unavailable' }, { status: 500 })
  }
}
