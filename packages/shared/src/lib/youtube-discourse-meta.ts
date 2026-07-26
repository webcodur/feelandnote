/**
 * 가상 담화(Discourse) 영상 종류·컴포지션 ID 단일원천(SSoT)
 *
 * Root.tsx 의 컴포지션 등록, 왕복 검증(scripts/discourse/verify.ts ③), 앞으로 붙을
 * 렌더 CLI·유튜브 업로드가 **이 한 곳**에서 영상 종류와 ID 를 얻는다.
 * 팩션은 예전에 같은 규칙이 Root.tsx 와 렌더 API 양쪽에 복붙돼 어긋난 사고 이력이 있다
 * (`youtube-faction-meta.ts` 주석 참조). 담화는 그 전에 합친다.
 *
 * ## 영상 구성 (한국어 세로 전용)
 *
 * - 쇼츠: 발언에 배정된 편(part) 수만큼. 배정이 없으면 전체가 단일 쇼츠(KO-S1).
 * - 롱폼: 롱폼 배치의 편 경계(cut)가 없으면 통짜 한 편(KO-LV), 있으면 KO-LV1·KO-LV2…
 *
 * ## 길이 판정은 여기 없다
 *
 * Root.tsx 는 길이가 0 이하인 컴포지션을 달지 않는다. 그 판정에는 렌더 측 `calcTotalFrames`
 * 가 필요한데 shared 는 sw/remotion 에 역의존할 수 없다. 그래서 **길이 계산기를 주입받는다**
 * (`durationOf`). 주입하지 않으면 길이 필터 없이 전 종류를 돌려준다.
 *
 * ## 타입은 경량 자체 정의
 *
 * 팩션 youtube-faction-meta 와 같은 원칙. 렌더의 `DiscourseScript` 는 이 형태를 만족한다.
 */

/** 종류 산출이 발언에게서 필요로 하는 것 */
export interface DiscourseTurnMeta {
  /** 쇼츠 편 번호. 미지정이면 편 배정 없음 */
  part?: number
  /** 영상 제외(데이터만 보관) */
  disabled?: boolean
}

/**
 * 롱폼 배치 한 칸(경량) — 편 경계(cut)·장 표지(era)·경계 기준점(turn).
 * `{ turn: n }` 의 n 은 행 참조가 아니라 **앞선 발언 개수**라 정수 그대로다(설계 §3 판단 ③).
 */
export type DiscourseLongformLayoutItem =
  | { cut: true }
  | { era: unknown }
  | { turn: number }

/** 종류 산출 입력 — 담화 스크립트의 상위 필드 일부만 추린 경량 형태 */
export interface DiscourseMetaInput {
  turns: ReadonlyArray<DiscourseTurnMeta>
  longformLayout?: ReadonlyArray<DiscourseLongformLayoutItem>
}

/** 영상 종류 한 가지. part 가 있으면 그 편 쇼츠, lvPart 가 있으면 그 편 롱폼. */
export interface DiscourseVariantDef {
  key: string
  label: string
  isShorts: boolean
  /** 쇼츠 편 번호 */
  part?: number
  /** 롱폼 편 번호(편 경계로 분할된 경우). 통짜 롱폼·쇼츠는 undefined */
  lvPart?: number
  /** 컴포지션 ID 접미사 = 출력 파일 접미사 (Root.tsx 등록과 일치) */
  fileSuffix: string
}

/**
 * 쇼츠 편 번호 목록 — 발언에 실제로 배정된 part 만. 없으면 [1](단일편).
 *
 * ⚠ 렌더 측 `Discourse/timing.ts:114 shortsPartNumbers` 와 **같은 규칙**이다.
 *   그쪽은 컷 구성에 쓰이고 이쪽은 종류 산출에 쓰인다. 왕복 검증 ③ 이 둘이 어긋나면 잡는다.
 */
export function discoursePartNumbers(turns: ReadonlyArray<DiscourseTurnMeta>): number[] {
  const set = new Set<number>()
  for (const t of turns) if (!t.disabled && t.part != null) set.add(t.part)
  return set.size ? [...set].sort((a, b) => a - b) : [1]
}

/** 편 경계(cut)로 가른 롱폼 편 번호 목록. 경계가 없으면 [](통짜 한 편) */
export function discourseLongformPartNumbers(
  layout?: ReadonlyArray<DiscourseLongformLayoutItem>,
): number[] {
  const cuts = (layout ?? []).filter(it => 'cut' in it).length
  if (cuts === 0) return []
  return Array.from({ length: cuts + 1 }, (_, i) => i + 1)
}

/**
 * 이 편이 만들어 내는 영상 종류 전량.
 *
 * 순서는 Root.tsx 등록 순서와 같다 — 쇼츠(편 오름차순) → 롱폼.
 *
 * @param durationOf 길이 계산기(선택). 주면 길이가 유한하고 0 초과인 종류만 남긴다
 *   (Root.tsx 가 `durS <= 0` 인 컴포지션을 달지 않는 것과 같은 규칙).
 */
export function discourseVariants(
  input: DiscourseMetaInput,
  durationOf?: (isShorts: boolean, part?: number, lvPart?: number) => number,
): DiscourseVariantDef[] {
  const keep = (isShorts: boolean, part?: number, lvPart?: number) => {
    if (!durationOf) return true
    const d = durationOf(isShorts, part, lvPart)
    return Number.isFinite(d) && d > 0
  }

  const parts = discoursePartNumbers(input.turns ?? [])
  const multi = parts.length > 1
  const shorts: DiscourseVariantDef[] = parts
    .filter(p => keep(true, p, undefined))
    .map(p => ({
      key: `ko-shorts-${p}`,
      label: multi ? `세로 쇼츠 ${p}편` : '세로 쇼츠',
      isShorts: true,
      part: p,
      fileSuffix: `KO-S${p}`,
    }))

  const lvParts = discourseLongformPartNumbers(input.longformLayout)
  const lvDefs: DiscourseVariantDef[] = lvParts.length === 0
    ? [{ key: 'ko-longform', label: '세로 롱폼', isShorts: false, fileSuffix: 'KO-LV' }]
    : lvParts.map(p => ({
        key: `ko-longform-${p}`,
        label: `세로 롱폼 ${p}편`,
        isShorts: false,
        lvPart: p,
        fileSuffix: `KO-LV${p}`,
      }))
  const longforms = lvDefs.filter(v => keep(false, undefined, v.lvPart))

  return [...shorts, ...longforms]
}

/**
 * 가상 담화 컴포지션 ID 앞머리 — `Discourse-<폴더명>`.
 *
 * 폴더명이 곧 컴포지션 ID이자 출고 파일명이므로 영문·숫자·하이픈만 허용한다
 * (팩션 `factionCompBase` 와 같은 규칙). 한글 등이 섞이면 Remotion 컴포지션 ID 로 쓸 수 없으므로
 * 즉시 에러를 던진다(조용한 폴백 금지).
 */
export function discourseCompBase(folder: string): string {
  if (!folder || /[^A-Za-z0-9-]/.test(folder)) {
    throw new Error(
      `discourseCompBase: 폴더명 '${folder}' 은 영문·숫자·하이픈만 허용 — 에피소드 폴더를 영문으로 만들어라`,
    )
  }
  return `Discourse-${folder}`
}

/** 컴포지션 ID 전체 — `Discourse-<폴더명>-<접미사>` */
export function discourseCompId(folder: string, variant: DiscourseVariantDef): string {
  return `${discourseCompBase(folder)}-${variant.fileSuffix}`
}
