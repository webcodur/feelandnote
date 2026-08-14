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
 * web-bo·remotion scripts가 공유한다.
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

export type EleAccountConfigIssueReason = 'api-key-id' | 'invalid-format'

export interface EleAccountConfigIssue {
  id: string
  label: string
  envVar: string
  reason: EleAccountConfigIssueReason
}

/**
 * ElevenLabs가 인증 헤더로 받는 것은 콘솔의 Key ID가 아니라 생성 직후 한 번 보여 주는 `sk_...` 비밀 키다.
 * 잘못된 값을 계정으로 등록하면 보이스 목록 조회와 유료 합성 시도가 인증 400으로 끝나므로,
 * 외부 요청 전에 형식을 판별한다. 실제 키 값은 오류나 로그에 절대 싣지 않는다.
 */
export function isElevenLabsSecretKey(value: string | null | undefined): boolean {
  return value?.trim().startsWith('sk_') === true
}

function configIssueOf(value: string): EleAccountConfigIssueReason | null {
  if (isElevenLabsSecretKey(value)) return null
  return /^[0-9a-f]{64}$/i.test(value.trim()) ? 'api-key-id' : 'invalid-format'
}

/** 값은 노출하지 않고 잘못 설정된 환경변수와 원인만 돌려준다. */
export function getEleAccountConfigIssues(): EleAccountConfigIssue[] {
  const issues: EleAccountConfigIssue[] = []
  for (const def of ACCOUNT_DEFS) {
    const value = readEnv(def.envVar)?.trim()
    if (!value) continue
    const reason = configIssueOf(value)
    if (reason) issues.push({ ...def, reason })
  }
  return issues
}

/** 관리자 화면·CLI에 공통으로 보여 줄 안전한 설정 오류. 비밀값은 포함하지 않는다. */
export function getEleAccountSetupError(): string {
  const issues = getEleAccountConfigIssues()
  if (issues.length > 0) {
    const details = issues.map(issue => issue.reason === 'api-key-id'
      ? `${issue.envVar}에 API Key ID가 들어 있음`
      : `${issue.envVar}가 ElevenLabs 비밀 키 형식(sk_...)이 아님`)
    return `ElevenLabs API 키 설정 오류: ${details.join(', ')}. ElevenLabs 콘솔에서 생성·회전할 때 표시되는 실제 sk_... 키로 교체해야 한다.`
  }
  return 'ElevenLabs API 키가 설정되지 않음 (.env의 ELEVENLABS_API_KEY / ELEVENLABS_API_KEY_FEELANDNOTE)'
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
    // Key ID나 잘린 값은 외부 요청에 절대 쓰지 않는다. 유효한 다른 계정은 계속 사용할 수 있다.
    if (apiKey && isElevenLabsSecretKey(apiKey)) out.push({ id: def.id, label: def.label, apiKey })
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
 * 1) accountId 힌트가 있으면 그 계정만 쓴다. 해당 계정 키가 없거나 잘못됐으면 null(다른 계정으로 우회하지 않음).
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

  const requestedAccountId = accountId?.trim()
  if (requestedAccountId) {
    // 저장된 계정 힌트가 있는데 해당 계정의 키가 잘못 설정됐다면 다른 계정으로 몰래 우회하지 않는다.
    // 같은 voiceId가 다른 계정에 있거나 없을 수 있어, 우회는 잘못된 목소리·오해하기 힘든 404를 만든다.
    return getEleAccountById(requestedAccountId) ?? null
  }

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
