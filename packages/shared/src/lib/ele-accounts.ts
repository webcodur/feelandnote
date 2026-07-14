/**
 * ElevenLabs 계정 레지스트리 — 단일 원천(SSoT)
 *
 * 과거 ElevenLabs 음성은 단일 키(ELEVENLABS_API_KEY) 하나로만 동작했다.
 * 계정마다 음성 슬롯·크레딧 한도가 따로라, 둘 이상의 계정을 동시에 붙여
 * 음성 목록을 합쳐 쓰고 생성도 음성이 속한 계정 키로 보내려면
 * "어떤 계정들이 있고, 각 계정의 키·라벨이 무엇인지"를 한곳에서 결정해야 한다.
 *
 * 서버 전용. 키는 NEXT_PUBLIC_ 접두사가 없어 클라이언트 번들엔 들어가지 않는다.
 * 클라이언트는 음성 목록 API 응답에 실린 account.id/account.label 만 본다.
 *
 * remotion-bo·web-bo·remotion scripts 가 공유한다.
 */

export interface EleAccount {
  /** 안정적인 식별자. 음성 목록·생성 요청에서 계정을 지목할 때 쓴다. */
  id: string
  /** 화면에 보여줄 한국어 라벨. */
  label: string
  /** ElevenLabs API 키. 서버에서만 노출된다. */
  apiKey: string
}

/** 계정 정의표 — 환경변수명 ↔ 식별자 ↔ 라벨. 계정 추가는 여기 한 줄. */
const ACCOUNT_DEFS: ReadonlyArray<{ id: string; label: string; envVar: string }> = [
  { id: 'default', label: '기본', envVar: 'ELEVENLABS_API_KEY' },
  { id: 'feelandnote', label: 'feelandnote', envVar: 'ELEVENLABS_API_KEY_FEELANDNOTE' },
]

/**
 * 환경변수 읽기 — 동적 process.env[key] 는 일부 번들러가 인라인하지 못하므로
 * 알려진 키는 정적 접근으로 읽는다.
 */
function readEnv(envVar: string): string | undefined {
  switch (envVar) {
    case 'ELEVENLABS_API_KEY':
      return process.env.ELEVENLABS_API_KEY
    case 'ELEVENLABS_API_KEY_FEELANDNOTE':
      return process.env.ELEVENLABS_API_KEY_FEELANDNOTE
    default:
      return process.env[envVar]
  }
}

/**
 * 환경변수가 채워진 계정만 순서대로 반환한다(앞쪽이 기본).
 * 키가 없는 계정은 자동으로 빠지므로, feelandnote 키가 없는 환경에선
 * 기존과 동일하게 기본 계정 하나로만 동작한다.
 */
export function getEleAccounts(): EleAccount[] {
  const out: EleAccount[] = []
  for (const def of ACCOUNT_DEFS) {
    const apiKey = readEnv(def.envVar)?.trim()
    if (apiKey) out.push({ id: def.id, label: def.label, apiKey })
  }
  return out
}

/** 식별자로 계정 하나를 찾는다. 없으면 undefined. */
export function getEleAccountById(id: string | null | undefined): EleAccount | undefined {
  if (!id) return undefined
  return getEleAccounts().find(a => a.id === id)
}

/** 첫 번째(기본) 계정. 하나도 설정되지 않았으면 undefined. */
export function getDefaultEleAccount(): EleAccount | undefined {
  return getEleAccounts()[0]
}

/** 라벨만 빠르게 조회. 없으면 식별자 그대로 돌려준다. */
export function eleAccountLabel(id: string | null | undefined): string {
  return getEleAccountById(id)?.label ?? (id ?? '')
}

/**
 * 주어진 음성이 어느 계정에 속하는지 판별한다.
 *
 * 1) accountId 힌트가 있고 유효하면 그 계정(목록에서 고른 경우 — 추가 조회 없음).
 * 2) 힌트가 없으면 각 계정에 GET /v1/voices/{voiceId} 를 순서대로 조회해
 *    이 음성을 가진(=소유하거나 접근 가능한) 첫 계정을 고른다.
 *    공용·기본(premade)·라이브러리 음성은 앞선(기본/유료) 계정이 우선된다.
 * 3) 어느 계정도 접근하지 못하면 null(잘못된 음성 ID). 호출부가 에러로 처리한다.
 *
 * 주의: Next.js App Router 는 같은 URL 의 fetch 를 요청 단위로 메모이제이션한다.
 * 계정별 API 키만 다른 병렬 조회가 한 응답으로 합쳐지면(무료 계정 404 재사용)
 * "계정을 찾지 못함" 오탐이 난다. 따라서 순차 조회 + cache:'no-store' + 계정별 URL 분리를 쓴다.
 */
export async function resolveEleAccountForVoice(
  voiceId: string,
  accountId?: string | null,
): Promise<EleAccount | null> {
  const id = voiceId.trim()
  if (!id) return null

  const hinted = getEleAccountById(accountId?.trim())
  if (hinted) return hinted

  const accounts = getEleAccounts()
  if (accounts.length === 0) return null
  // 계정이 하나면 그 키로 시도(소유 여부는 TTS 단계에서 판별). 추가 조회 비용 없음.
  if (accounts.length === 1) return accounts[0]

  for (const acc of accounts) {
    try {
      // _acc 쿼리는 ElevenLabs 가 무시하는 메모이제이션 분리 키.
      const res = await fetch(`https://api.elevenlabs.io/v1/voices/${encodeURIComponent(id)}?_acc=${encodeURIComponent(acc.id)}`, {
        headers: { 'xi-api-key': acc.apiKey, Accept: 'application/json' },
        cache: 'no-store',
      })
      if (res.ok) return acc
    } catch {
      // 네트워크 오류 시 다음 계정
    }
  }
  return null
}
