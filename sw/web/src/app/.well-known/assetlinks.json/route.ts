/*
  파일명: /app/.well-known/assetlinks.json/route.ts
  기능: Digital Asset Links 응답
  책임: 안드로이드 앱(TWA/App Links)과 도메인의 소유자 일치 검증에 쓰이는 statement 목록을 제공한다.
*/

// 서명 지문은 환경(개발·업로드·Play 앱 서명)마다 다르므로 저장소에 박지 않고 환경변수에서 읽는다.
// 값이 없으면 가짜 지문을 채우지 않고 빈 목록으로 응답하며, 서버 로그에 경고를 남긴다.

const DEFAULT_PACKAGE_NAME = 'com.feelandnote.app'

// SHA-256 인증서 지문: 대문자 16진수 2자리 32묶음을 콜론으로 이은 형태
const FINGERPRINT_PATTERN = /^[0-9A-F]{2}(:[0-9A-F]{2}){31}$/

interface AssetLinkStatement {
  relation: string[]
  target: {
    namespace: string
    package_name: string
    sha256_cert_fingerprints: string[]
  }
}

function resolvePackageName(): string {
  const raw = process.env.ANDROID_APP_PACKAGE_NAME?.trim()
  return raw ? raw : DEFAULT_PACKAGE_NAME
}

function resolveFingerprints(): string[] {
  const raw = process.env.ANDROID_APP_CERT_FINGERPRINTS?.trim()

  if (!raw) {
    console.warn(
      '[assetlinks] ANDROID_APP_CERT_FINGERPRINTS 미설정 — 지문 없이 응답한다. 안드로이드 앱 도메인 검증은 실패한다',
    )
    return []
  }

  const candidates = raw
    .split(',')
    .map((value) => value.trim().toUpperCase())
    .filter(Boolean)

  const valid = candidates.filter((value) => FINGERPRINT_PATTERN.test(value))
  const invalid = candidates.filter((value) => !FINGERPRINT_PATTERN.test(value))

  if (invalid.length > 0) {
    console.warn(
      `[assetlinks] 형식이 맞지 않는 지문 ${invalid.length}개를 제외했다 (SHA-256 콜론 표기 필요): ${invalid.join(' | ')}`,
    )
  }

  if (valid.length === 0) {
    console.warn('[assetlinks] 유효한 지문이 없다 — 빈 목록으로 응답한다')
  }

  return valid
}

export async function GET() {
  const statements: AssetLinkStatement[] = [
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: resolvePackageName(),
        sha256_cert_fingerprints: resolveFingerprints(),
      },
    },
  ]

  return new Response(JSON.stringify(statements, null, 2), {
    status: 200,
    headers: {
      // Google 검증기는 application/json 응답만 받아들인다
      'content-type': 'application/json',
      'cache-control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
