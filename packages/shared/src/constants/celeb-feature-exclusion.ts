// 추천 노출 제외 인물(feature-excluded celebs) — Single Source of Truth
//
// 서비스가 스스로 앞세우는 자리(오늘의 인물 편성)에 세우지 않는 인물의 명단이다.
// 인물 상세·검색·탐색 목록에는 그대로 나온다 — 기록 자체를 숨기는 것이 아니라
// 「오늘 이 사람을 보라」고 서비스가 권하는 일만 막는다.
//
// 26.09.18 뉴스 화제도 규칙이 시진핑을 오늘의 인물로 세운 뒤 만들었다. 편성 규칙(뉴스·생일·시드)은
// 화제도와 기록 수만 보므로 인물이 누구인지는 여기서만 거른다. DB 컬럼을 두지 않는다 — 판단 기준이
// 바뀌면 이 파일 한 곳을 고친다. 슬러그로 적으므로 비활성 인물도 미리 올려 둘 수 있다.

/** 사유별 명단. 사유는 사람이 읽는 근거이고 코드는 합집합만 쓴다 */
export const FEATURE_EXCLUDED_CELEBS = {
  /** 집단 학살·전쟁범죄 책임자와 독재자. 근현대(20세기 이후)만 다룬다 — 전근대 정복자는 다른 잣대라 여기 넣지 않는다 */
  atrocity_and_dictatorship: [
    // 나치 지도부
    'adolf-hitler',
    'heinrich-himmler',
    'reinhard-heydrich',
    'hermann-goring',
    'joseph-goebbels',
    // 일본 제국 전범
    'hideki-tojo',
    'shiro-ishii',
    'yasuji-okamura',
    // 파시즘·공산 독재
    'benito-mussolini',
    'joseph-stalin',
    'mao-zedong',
    // 아프리카·중앙아시아 독재
    'idi-amin',
    'jean-bedel-bokassa',
    'mobutu-sese-seko',
    'muammar-gaddafi',
    'saparmurat-niyazov',
    // 한국 군사 독재
    'chun-doo-hwan',
    // 현직
    'xi-jinping',
    'vladimir-putin',
    'kim-jong-un',
  ],
  /** 평가가 갈리는 권위주의·전범 재판 관련 인물. 서비스가 「오늘의 인물」로 권하기엔 논쟁이 앞선다 */
  contested_authoritarian: [
    // 독재 통치 — 공과 논쟁
    'park-chung-hee',
    'syngman-rhee',
    'vladimir-lenin',
    'deng-xiaoping',
    'chiang-kai-shek',
    'fidel-castro',
    'ho-chi-minh',
    'maximilien-robespierre',
    'yuan-shikai',
    // 전범 재판 유죄·전쟁 책임
    'albert-speer',
    'karl-donitz',
    'seishiro-itagaki',
    'emperor-showa',
    // 스탈린 측근·비시 정권
    'vyacheslav-molotov',
    'kliment-voroshilov',
    'philippe-petain',
    // 현직 권위주의
    'mohammed-bin-salman',
    'recep-tayyip-erdogan',
    'benjamin-netanyahu',
  ],
} as const satisfies Record<string, readonly string[]>

export type FeatureExclusionReason = keyof typeof FEATURE_EXCLUDED_CELEBS

/** 편성 코드가 보는 합집합 */
export const FEATURE_EXCLUDED_CELEB_SLUGS: ReadonlySet<string> = new Set(
  Object.values(FEATURE_EXCLUDED_CELEBS).flat(),
)

export function isFeatureExcludedCeleb(slug: string | null | undefined): boolean {
  return !!slug && FEATURE_EXCLUDED_CELEB_SLUGS.has(slug)
}
