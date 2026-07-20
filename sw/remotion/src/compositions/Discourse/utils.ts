/**
 * 가상 담화(Discourse) 컷 화면 공통 헬퍼 — 순수 로직(JSX 없음).
 *
 * 화면 규격·카메라 모션 계산은 팩션 것을 **그대로 가져다 쓴다**(복제 금지).
 * 두 시리즈가 같은 무대를 쓰므로 계산이 갈리면 같은 채널 영상으로 보이지 않는다.
 * 담화 고유의 축(발언→인물→전역 계승, 담화 이미지 경로, 인물색 폴백, 발언 컷 내부 시각)만 여기서 만든다.
 */
import { staticFile } from 'remotion'
import type { DiscourseScript, Speaker, Turn, DiscourseHoldMotion, DiscourseTransition } from './types'
import { CAST_COLORS, DEFAULT_ACCENT, DEFAULT_NOTICE, DEFAULT_NOTICE_EN } from './constants'
import { TURN_PAD_SEC, turnSec } from './timing'

// 팩션 재사용 — 카메라 모션·통합 명칭 분해·발화 시각 상대화는 시리즈와 무관한 순수 계산이다.
export {
  holdMotionParts,
  holdMotionTransform,
  holdAndShakeParts,
  isPushinZoom,
  nameHead,
  nameTail,
  sliceLocalTimings,
  isVideoSrc,
} from '../Faction/utils'

/**
 * 이름 → 사진 없는 인물 자리에 띄울 글자.
 *
 * 팩션 `initials` 를 쓰지 않는다. 그쪽은 영문 이름 전제(Elon Musk → EM)라
 * 한글 이름에 걸면 '일론 머스크' → '일머', '진시황' → '진시' 처럼 읽을 수 없는 글자가 나온다.
 * 담화는 인물 이름이 한글이 기본이므로 **한글이면 첫 글자 한 자**만 쓴다(문패처럼).
 * 영문 이름은 팩션과 같은 두 자 이니셜.
 */
export const initials = (name: string): string => {
  const n = name.trim()
  if (!n) return '?'
  if (/[가-힣]/.test(n)) return n[0] // 한글 — 첫 글자 한 자 (진시황→진, 샘 알트만→샘)
  const parts = n.split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return ((parts[0][0] ?? '') + (parts[parts.length - 1][0] ?? '')).toUpperCase()
}

/**
 * 지속 효과 해석 — 발언 → 인물 → 에피소드 순으로 명시값을 찾고, 없으면 'none'(정지).
 * 팩션의 인물→세력→에피소드 3단 계승과 같은 구조다(팩션 것은 Faction 타입에 묶여 있어 이 한 겹만 새로 짠다).
 * noZoom 은 전 컷 정지 스위치라 계승보다 우선한다.
 */
export const resolveHoldMotion = (
  turn: Turn | undefined,
  speaker: Speaker | undefined,
  script: DiscourseScript,
): DiscourseHoldMotion =>
  script.noZoom ? 'none' : (turn?.holdMotion ?? speaker?.holdMotion ?? script.holdMotion ?? 'none')

/** 진입 전환 해석 — 발언 → 인물 → 에피소드 계승. 미지정이면 undefined(크로스페이드) */
export const resolveTransition = (
  turn: Turn | undefined,
  speaker: Speaker | undefined,
  script: DiscourseScript,
): DiscourseTransition | undefined =>
  turn?.transition ?? speaker?.transition ?? script.transition

/**
 * 인물·시작·종료 이미지 경로.
 * - 외부 URL(http) → 그대로
 * - 폴더 경로(슬래시 포함, 예: 'cast/qin-shi-huang/01.png') → 에피소드 폴더 하위에서 직접
 * - basename(예: 'intro.png') → 에피소드 폴더 하위 images/ 에서 찾는다 (BO 업로드 호환)
 */
export const imgSrc = (episodeName: string, image: string): string =>
  /^https?:\/\//.test(image)
    ? image
    : image.includes('/')
      ? staticFile(`discourses/${episodeName}/${image}`)
      : staticFile(`discourses/${episodeName}/images/${image}`)

/**
 * 인물 색 — 데이터에 있으면 그것, 없으면 기본 팔레트를 자리 번호로 돌려 쓴다.
 * 담화는 누가 말하는지를 색으로 알리므로 인물마다 반드시 갈려야 한다.
 */
export const castColor = (speaker: Speaker | undefined, castIndex: number): string =>
  speaker?.color ?? CAST_COLORS[castIndex % CAST_COLORS.length] ?? DEFAULT_ACCENT

/**
 * 고지 문구 — 데이터에 없으면 기본 문구로 폴백한다.
 * **빈 문자열을 돌려주지 않는다.** 고지 없는 화면은 이 시리즈에서 허용하지 않는다(§3 고지 원칙).
 */
export const resolveNotice = (script: DiscourseScript, isEn: boolean): string => {
  const own = script.notice?.trim()
  if (own) return own
  return isEn ? DEFAULT_NOTICE_EN : DEFAULT_NOTICE
}

/**
 * 발언 컷 안에서 자막·음성이 시작하는 시각(초, 컷 로컬).
 * 컷 앞뒤 여백(TURN_PAD_SEC)을 절반씩 나눠 앞은 자막이 뜨는 틈, 뒤는 넘어가기 전 숨으로 쓴다.
 */
export const turnEnterSec = (): number => TURN_PAD_SEC / 2

/**
 * 발언 자막·음성이 흐르는 길이(초) — 컷 길이에서 앞뒤 여백을 뺀 값.
 * **렌더(TurnCard)와 자막(subs.ts)이 이 함수를 공유한다.** 각자 계산하면 자막이 영상과 어긋난다.
 */
export const turnSpeakSec = (t: Turn): number => Math.max(0.1, turnSec(t) - TURN_PAD_SEC)

/** 발언의 자막 덩어리 — chunks 가 있으면 그 배열, 없으면 text 통째 한 덩어리 */
export const turnChunks = (t: Turn): string[] =>
  t.chunks?.length ? t.chunks : (t.text ? [t.text] : [])

/**
 * 실제 발언 원문(origin)을 화면에 띄울 것인가.
 *
 * 원문은 **시청자가 읽을 수 있을 때만** 뜻이 있다. 머스크·알트만 편의 영어 원문은 읽히므로
 * "이건 진짜 한 말"이라는 근거가 되지만, 『사기』의 한문 사료는 읽히지 않아 화면에선 노이즈다.
 * 게다가 담화 대사가 이미 그 문장을 한글로 옮긴 것이라 같은 말을 두 번 보여주게 된다.
 * 읽히지 않는 원문은 화면에서 빼고 출처만 남긴다 — 데이터의 origin 은 검증 근거로 그대로 둔다.
 *
 * 판별은 한자(CJK 통합한자) 포함 여부. 한글 자막을 보는 시청자 기준이다.
 */
export const readableOrigin = (origin?: string): boolean =>
  !!origin && !/[一-鿿]/.test(origin)
