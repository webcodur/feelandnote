'use client'

import { useEffect, useState } from 'react'
import { Info } from 'lucide-react'

// 인앱 브라우저 감지
function detectInAppBrowser(): string | null {
  if (typeof window === 'undefined') return null

  const ua = navigator.userAgent.toLowerCase()

  // 주요 인앱 브라우저 패턴
  const patterns: Record<string, string> = {
    kakaotalk: '카카오톡',
    instagram: '인스타그램',
    fban: '페이스북',
    fbav: '페이스북',
    fb_iab: '페이스북',
    line: 'LINE',
    naver: '네이버',
    band: '밴드',
    twitter: '트위터',
    snapchat: '스냅챗',
    linkedin: '링크드인',
    pinterest: '핀터레스트',
    telegram: '텔레그램',
    weibo: '웨이보',
    wechat: '위챗',
    micromessenger: '위챗',
  }

  for (const [key, name] of Object.entries(patterns)) {
    if (ua.includes(key)) return name
  }

  // iOS WebView 감지 (Safari가 아닌 WebView)
  const isIOS = /iphone|ipad|ipod/.test(ua)
  const isSafari = /safari/.test(ua) && !/crios|fxios/.test(ua)
  if (isIOS && !isSafari && /webkit/.test(ua)) {
    return '앱 내 브라우저'
  }

  // Android WebView 감지
  if (/android/.test(ua) && /wv|\.0\.0\.0/.test(ua)) {
    return '앱 내 브라우저'
  }

  return null
}

export default function InAppBrowserWarning() {
  const [appName, setAppName] = useState<string | null>(null)

  useEffect(() => {
    setAppName(detectInAppBrowser())
  }, [])

  if (!appName) return null

  return (
    <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4">
      <div className="flex items-start gap-3">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-400" />
        <div>
          <p className="font-medium text-blue-400">
            모바일에서는 {appName} 로그인을 이용해 주세요
          </p>
          <p className="mt-1 text-sm text-zinc-400">
            Google 로그인은 외부 브라우저(Chrome, Safari)에서만 가능합니다.
          </p>
        </div>
      </div>
    </div>
  )
}
