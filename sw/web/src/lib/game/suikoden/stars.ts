// 천도 v2 — 108성(星) 칭호
// 『수호전』 제71회 석갈(石碣)의 좌차 순서: 천강성 36 + 지살성 72.
// 출처 대조: 중문 위키백과 「一百單八將」 座次 표(26.09.28 확인). 한글은 한자 독음.
// 플레이어 세력에 합류한 순서대로 1번(천괴성)부터 칭호를 받는다.

interface StarName {
  ko: string
}

const HEAVENLY: StarName[] = [
  { ko: '천괴성' }, { ko: '천강성' }, { ko: '천기성' },
  { ko: '천한성' }, { ko: '천용성' }, { ko: '천웅성' },
  { ko: '천맹성' }, { ko: '천위성' }, { ko: '천영성' },
  { ko: '천귀성' }, { ko: '천부성' }, { ko: '천만성' },
  { ko: '천고성' }, { ko: '천상성' }, { ko: '천립성' },
  { ko: '천첩성' }, { ko: '천암성' }, { ko: '천우성' },
  { ko: '천공성' }, { ko: '천속성' }, { ko: '천이성' },
  { ko: '천살성' }, { ko: '천미성' }, { ko: '천구성' },
  { ko: '천퇴성' }, { ko: '천수성' }, { ko: '천검성' },
  { ko: '천평성' }, { ko: '천죄성' }, { ko: '천손성' },
  { ko: '천패성' }, { ko: '천뢰성' }, { ko: '천혜성' },
  { ko: '천폭성' }, { ko: '천곡성' }, { ko: '천교성' },
]

const EARTHLY: StarName[] = [
  { ko: '지괴성' }, { ko: '지살성' }, { ko: '지용성' },
  { ko: '지걸성' }, { ko: '지웅성' }, { ko: '지위성' },
  { ko: '지영성' }, { ko: '지기성' }, { ko: '지맹성' },
  { ko: '지문성' }, { ko: '지정성' }, { ko: '지활성' },
  { ko: '지합성' }, { ko: '지강성' }, { ko: '지암성' },
  { ko: '지축성' }, { ko: '지회성' }, { ko: '지좌성' },
  { ko: '지우성' }, { ko: '지령성' }, { ko: '지수성' },
  { ko: '지미성' }, { ko: '지혜성' }, { ko: '지폭성' },
  { ko: '지연성' }, { ko: '지창성' }, { ko: '지광성' },
  { ko: '지비성' }, { ko: '지주성' }, { ko: '지교성' },
  { ko: '지명성' }, { ko: '지진성' }, { ko: '지퇴성' },
  { ko: '지만성' }, { ko: '지수성' }, { ko: '지주성' },
  { ko: '지은성' }, { ko: '지이성' }, { ko: '지리성' },
  { ko: '지준성' }, { ko: '지락성' }, { ko: '지첩성' },
  { ko: '지속성' }, { ko: '지진성' }, { ko: '지기성' },
  { ko: '지마성' }, { ko: '지요성' }, { ko: '지유성' },
  { ko: '지복성' }, { ko: '지벽성' }, { ko: '지공성' },
  { ko: '지고성' }, { ko: '지전성' }, { ko: '지단성' },
  { ko: '지각성' }, { ko: '지수성' }, { ko: '지장성' },
  { ko: '지평성' }, { ko: '지손성' }, { ko: '지노성' },
  { ko: '지찰성' }, { ko: '지악성' }, { ko: '지추성' },
  { ko: '지수성' }, { ko: '지음성' }, { ko: '지형성' },
  { ko: '지장성' }, { ko: '지열성' }, { ko: '지건성' },
  { ko: '지모성' }, { ko: '지적성' }, { ko: '지구성' },
]

export const STARS: StarName[] = [...HEAVENLY, ...EARTHLY]

export const STAR_COUNT = STARS.length // 108
export const HEAVENLY_COUNT = HEAVENLY.length // 36

/** 화면 표기: 한국어 칭호 또는 영어 이름. */
export function starLabel(index: number, locale: 'ko' | 'en'): { text: string } | null {
  const star = STARS[index]
  if (!star) return null
  if (locale === 'en') {
    const heavenly = index < HEAVENLY_COUNT
    const n = heavenly ? index + 1 : index - HEAVENLY_COUNT + 1
    return { text: heavenly ? `Heavenly Spirit ${n}` : `Earthly Fiend ${n}` }
  }
  return { text: star.ko }
}
