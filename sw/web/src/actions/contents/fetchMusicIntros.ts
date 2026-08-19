/*
  파일명: /actions/contents/fetchMusicIntros.ts
  기능: 음악 작품의 소개를 바깥 출처에서 모은다.
  책임: 애플이 음악 소개를 주지 않으므로 위키백과와 Last.fm에서 받아 온다.
        확신이 서는 문서만 담고, 못 찾으면 그 출처를 빼고 돌려준다.
*/ // ------------------------------
'use server'

import { unstable_cache } from 'next/cache'
import { getAlbumIntro, getTrackIntro, isLastfmEnabled } from '@feelandnote/content-search/lastfm'
import { getMusicIntro, type MusicUnit } from '@feelandnote/content-search/wikipedia'
import { STATIC_REVALIDATE } from '@/lib/cache'

export interface ContentIntroSource {
  /** 화면이 탭 이름과 출처 표기에 쓴다 */
  provider: 'wikipedia' | 'lastfm'
  text: string
  url: string
}

interface MusicNames {
  koTitle: string
  koArtist: string
  enTitle: string
  enArtist: string
}

async function fetchFromWikipedia(
  unit: MusicUnit,
  names: MusicNames,
  locale: string,
): Promise<ContentIntroSource | null> {
  /* 위키 문서 제목은 그 언어판의 표기를 따른다 — 한국어판은 한국어 제목으로 찾아야 걸린다.
     국문 화면은 한국어 문서를 먼저 보고, 없으면 영문 문서라도 보여 준다. */
  const attempts: { language: 'ko' | 'en'; title: string; artist: string }[] =
    locale === 'ko'
      ? [
          { language: 'ko', title: names.koTitle, artist: names.koArtist },
          { language: 'en', title: names.enTitle, artist: names.enArtist },
        ]
      : [{ language: 'en', title: names.enTitle, artist: names.enArtist }]

  for (const attempt of attempts) {
    if (!attempt.title || !attempt.artist) continue
    const found = await getMusicIntro(unit, attempt.title, attempt.artist, attempt.language)
    if (found) return { provider: 'wikipedia', text: found.text, url: found.url }
  }
  return null
}

async function fetchFromLastfm(
  unit: MusicUnit,
  names: MusicNames,
  locale: string,
): Promise<ContentIntroSource | null> {
  if (!isLastfmEnabled()) return null
  // Last.fm 목록은 영문 표기로 쌓여 있다. 언어는 lang으로만 요청한다.
  const title = names.enTitle || names.koTitle
  const artist = names.enArtist || names.koArtist
  if (!title || !artist) return null
  const found = unit === 'album'
    ? await getAlbumIntro(artist, title, locale)
    : await getTrackIntro(artist, title, locale)
  return found ? { provider: 'lastfm', text: found.text, url: found.url } : null
}

/** 앞부분이 같으면 같은 글로 본다. 문장부호·공백 차이는 무시한다 */
function sharePrefix(a: string, b: string): boolean {
  const strip = (value: string) => value.toLowerCase().replace(/[^a-z0-9가-힣]/g, '')
  const left = strip(a)
  const right = strip(b)
  if (left.length < 40 || right.length < 40) return left === right
  return left.startsWith(right.slice(0, 40)) || right.startsWith(left.slice(0, 40))
}

const getCachedMusicIntros = unstable_cache(
  async (unit: MusicUnit, names: MusicNames, locale: string) => {
    const [wikipedia, lastfm] = await Promise.all([
      fetchFromWikipedia(unit, names, locale),
      fetchFromLastfm(unit, names, locale),
    ])
    // Last.fm 요약은 위키백과 복제가 흔하다 — 같은 글을 탭 두 개로 보여 주지 않는다
    const duplicated = wikipedia && lastfm && sharePrefix(wikipedia.text, lastfm.text)
    return [wikipedia, duplicated ? null : lastfm].filter(
      (item): item is ContentIntroSource => item !== null,
    )
  },
  ['music-intro-sources-v2'],
  { revalidate: STATIC_REVALIDATE },
)

/**
 * 음악 소개를 출처별로 모아 돌려준다. 화면은 둘 이상이면 탭으로 보여 준다.
 *
 * 제목·아티스트만으로 찾으므로 클래식 음반과 영문 문서가 없는 가요는 비는 것이 정상이다.
 */
export async function fetchMusicIntros(
  unit: MusicUnit,
  names: Partial<MusicNames>,
  locale: string,
): Promise<ContentIntroSource[]> {
  const filled: MusicNames = {
    koTitle: names.koTitle ?? '',
    koArtist: names.koArtist ?? '',
    enTitle: names.enTitle ?? '',
    enArtist: names.enArtist ?? '',
  }
  if (!(filled.koTitle || filled.enTitle)) return []
  try {
    return await getCachedMusicIntros(unit, filled, locale === 'ko' ? 'ko' : 'en')
  } catch (error) {
    console.error('[fetchMusicIntros]', filled.enTitle || filled.koTitle, error)
    return []
  }
}
