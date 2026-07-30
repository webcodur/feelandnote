/*
  파일명: /app/manifest.ts
  기능: 웹 앱 manifest (/manifest.webmanifest)
  책임: 설치형 PWA와 안드로이드 TWA 포장에 필요한 앱 정체성·아이콘·바로가기를 선언한다.
*/ // ------------------------------

import type { MetadataRoute } from 'next'

// TWA 실행을 웹 방문과 구분하는 계측 파라미터
const TWA_UTM = 'utm_source=android_app&utm_medium=twa'

// 런처 바로가기 — 실재하는 경로만 등록한다
// /explore/today  오늘의 인물
// /search         검색
// /login          내 기록관 (로그인 사용자는 미들웨어가 /{userId}/reading 으로 보낸다)
// 빠른 기록은 홈 탭 안에서만 열리는 화면이라 고유 주소가 없어 제외했다
const SHORTCUTS = [
  { name: '오늘의 인물', short_name: '오늘', description: '오늘 소개하는 인물을 본다', path: '/explore/today', tag: 'today' },
  { name: '검색', short_name: '검색', description: '인물과 작품을 검색한다', path: '/search', tag: 'search' },
  { name: '내 기록관', short_name: '기록관', description: '내가 남긴 감상 기록을 본다', path: '/login', tag: 'chamber' },
] as const

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Feel&Note - 감상 아카이브',
    short_name: 'Feel&Note',
    description: '인물의 책장과 감상 경로를 탐색하고, 나의 문화 기록을 빠르게 남기는 앱',
    lang: 'ko',
    dir: 'ltr',
    start_url: `/?${TWA_UTM}`,
    scope: '/',
    display: 'standalone',
    orientation: 'any',
    background_color: '#0a0a0a',
    theme_color: '#c8a97e',
    categories: ['books', 'education', 'entertainment', 'lifestyle'],
    icons: [
      { src: '/icons/android-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/android-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/android-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: SHORTCUTS.map(({ name, short_name, description, path, tag }) => ({
      name,
      short_name,
      description,
      url: `${path}?${TWA_UTM}&utm_content=shortcut_${tag}`,
    })),
  }
}
