'use client'

import { useEffect, useState } from 'react'
import { Info, Copy, Check } from 'lucide-react'

type InAppBrowserInfo = {
  name: string
  type: 'kakaotalk' | 'other'
} | null

// 인앱 브라우저 감지
function detectInAppBrowser(): InAppBrowserInfo {
  if (typeof window === 'undefined') return null

  const ua = navigator.userAgent.toLowerCase()

  // 카카오톡 (외부 브라우저 열기 지원)
  if (ua.includes('kakaotalk')) {
    return { name: '카카오톡', type: 'kakaotalk' }
  }

  // 기타 인앱 브라우저 패턴
  const patterns: Record<string, string> = {
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
    if (ua.includes(key)) return { name, type: 'other' }
  }

  // iOS WebView 감지 (Safari가 아닌 WebView)
  const isIOS = /iphone|ipad|ipod/.test(ua)
  const isSafari = /safari/.test(ua) && !/crios|fxios/.test(ua)
  if (isIOS && !isSafari && /webkit/.test(ua)) {
    return { name: '앱 내 브라우저', type: 'other' }
  }

  // Android WebView 감지
  if (/android/.test(ua) && /wv|\.0\.0\.0/.test(ua)) {
    return { name: '앱 내 브라우저', type: 'other' }
  }

  return null
}

// 외부 브라우저로 열기
function openExternalBrowser(type: 'kakaotalk' | 'other') {
  const currentUrl = window.location.href

  if (type === 'kakaotalk') {
    // 카카오톡 전용 스킴
    window.location.href = `kakaotalk://web/openExternal?url=${encodeURIComponent(currentUrl)}`
  }
}

export default function InAppBrowserWarning() {
  const [browserInfo, setBrowserInfo] = useState<InAppBrowserInfo>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const info = detectInAppBrowser()
    setBrowserInfo(info)

    // 카카오톡 인앱브라우저면 자동으로 외부 브라우저로 이동
    if (info?.type === 'kakaotalk') {
      openExternalBrowser('kakaotalk')
    }
  }, [])

  // 카카오톡은 자동 이동하므로 UI 표시 불필요
  if (!browserInfo || browserInfo.type === 'kakaotalk') return null

  const handleCopyUrl = async () => {
    await navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // 카카오톡 외 인앱브라우저는 URL 복사 안내
  return (
    <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4">
      <div className="flex items-start gap-3">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-400" />
        <div className="flex-1">
          <p className="font-medium text-blue-400">
            {browserInfo.name} 내 브라우저에서 접속 중
          </p>
          <p className="mt-1 text-sm text-zinc-400">
            Google 로그인은 외부 브라우저(Chrome, Safari)에서만 가능합니다.
          </p>

          <button
            onClick={handleCopyUrl}
            className="mt-3 flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-sm font-medium text-zinc-300"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? '복사됨' : 'URL 복사'}
          </button>
        </div>
      </div>
    </div>
  )
}
