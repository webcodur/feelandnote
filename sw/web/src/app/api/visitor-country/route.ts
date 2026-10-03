import { NextRequest, NextResponse } from 'next/server'
import { getVisitorCountry } from '@/lib/visitorCountryServer'
import { getCelebDirectory } from '@/actions/celebs/getCelebDirectory'
import { CELEB_PROFESSIONS } from '@/constants/celebProfessions'

export async function GET(request: NextRequest) {
  const country = await getVisitorCountry()
  const profession = request.nextUrl.searchParams.get('profession')
  const directory = request.nextUrl.searchParams.get('directory') === '1'
  if (profession && !CELEB_PROFESSIONS.some(item => item.value === profession)) {
    return NextResponse.json({ country, figures: [] }, { status: 400, headers: { 'Cache-Control': 'private, no-store' } })
  }
  const figures = directory && country
    ? (await getCelebDirectory()).filter(item => item.nationality === country && (!profession || item.profession === profession))
      .map(({ slug, nickname, nickname_en, title, title_en }) => ({ slug, nickname, nickname_en, title, title_en }))
    : []
  return NextResponse.json({ country, ...(directory ? { figures } : {}) }, { headers: { 'Cache-Control': 'private, no-store' } })
}
