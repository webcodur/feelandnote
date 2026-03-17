/**
 * web 앱의 캐시를 무효화한다.
 * web-bo에서 셀럽 데이터 변경 후 호출.
 */
export async function revalidateWebCache(tag: 'celebs' = 'celebs') {
  const webUrl = process.env.NEXT_PUBLIC_WEB_URL || 'https://feelandnote.com'
  const secret = process.env.CRON_SECRET

  if (!secret) {
    console.warn('[revalidate] CRON_SECRET 미설정 — 캐시 무효화 생략')
    return
  }

  try {
    const res = await fetch(`${webUrl}/api/revalidate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tag, secret }),
    })

    if (!res.ok) {
      console.warn(`[revalidate] 실패: ${res.status}`)
    }
  } catch (e) {
    // 네트워크 오류 시 무시 — 1시간 후 자동 갱신
    console.warn('[revalidate] 연결 실패 — 자동 갱신 대기')
  }
}
