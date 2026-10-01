// 천도 v2 — 108성(星) 칭호
// 『수호전』 제71회 석갈(石碣)의 좌차 순서: 천강성 36 + 지살성 72.
// 출처 대조: 중문 위키백과 「一百單八將」 座次 표(26.09.28 확인). 한글은 한자 독음.
// 플레이어 세력에 합류한 순서대로 1번(천괴성)부터 칭호를 받는다.

interface StarName {
  hanja: string
  ko: string
}

const HEAVENLY: StarName[] = [
  { hanja: '天魁星', ko: '천괴성' }, { hanja: '天罡星', ko: '천강성' }, { hanja: '天機星', ko: '천기성' },
  { hanja: '天閒星', ko: '천한성' }, { hanja: '天勇星', ko: '천용성' }, { hanja: '天雄星', ko: '천웅성' },
  { hanja: '天猛星', ko: '천맹성' }, { hanja: '天威星', ko: '천위성' }, { hanja: '天英星', ko: '천영성' },
  { hanja: '天貴星', ko: '천귀성' }, { hanja: '天富星', ko: '천부성' }, { hanja: '天滿星', ko: '천만성' },
  { hanja: '天孤星', ko: '천고성' }, { hanja: '天傷星', ko: '천상성' }, { hanja: '天立星', ko: '천립성' },
  { hanja: '天捷星', ko: '천첩성' }, { hanja: '天暗星', ko: '천암성' }, { hanja: '天祐星', ko: '천우성' },
  { hanja: '天空星', ko: '천공성' }, { hanja: '天速星', ko: '천속성' }, { hanja: '天異星', ko: '천이성' },
  { hanja: '天殺星', ko: '천살성' }, { hanja: '天微星', ko: '천미성' }, { hanja: '天究星', ko: '천구성' },
  { hanja: '天退星', ko: '천퇴성' }, { hanja: '天壽星', ko: '천수성' }, { hanja: '天劍星', ko: '천검성' },
  { hanja: '天平星', ko: '천평성' }, { hanja: '天罪星', ko: '천죄성' }, { hanja: '天損星', ko: '천손성' },
  { hanja: '天敗星', ko: '천패성' }, { hanja: '天牢星', ko: '천뢰성' }, { hanja: '天慧星', ko: '천혜성' },
  { hanja: '天暴星', ko: '천폭성' }, { hanja: '天哭星', ko: '천곡성' }, { hanja: '天巧星', ko: '천교성' },
]

const EARTHLY: StarName[] = [
  { hanja: '地魁星', ko: '지괴성' }, { hanja: '地煞星', ko: '지살성' }, { hanja: '地勇星', ko: '지용성' },
  { hanja: '地傑星', ko: '지걸성' }, { hanja: '地雄星', ko: '지웅성' }, { hanja: '地威星', ko: '지위성' },
  { hanja: '地英星', ko: '지영성' }, { hanja: '地奇星', ko: '지기성' }, { hanja: '地猛星', ko: '지맹성' },
  { hanja: '地文星', ko: '지문성' }, { hanja: '地正星', ko: '지정성' }, { hanja: '地闊星', ko: '지활성' },
  { hanja: '地闔星', ko: '지합성' }, { hanja: '地強星', ko: '지강성' }, { hanja: '地暗星', ko: '지암성' },
  { hanja: '地軸星', ko: '지축성' }, { hanja: '地會星', ko: '지회성' }, { hanja: '地佐星', ko: '지좌성' },
  { hanja: '地佑星', ko: '지우성' }, { hanja: '地靈星', ko: '지령성' }, { hanja: '地獸星', ko: '지수성' },
  { hanja: '地微星', ko: '지미성' }, { hanja: '地慧星', ko: '지혜성' }, { hanja: '地暴星', ko: '지폭성' },
  { hanja: '地然星', ko: '지연성' }, { hanja: '地猖星', ko: '지창성' }, { hanja: '地狂星', ko: '지광성' },
  { hanja: '地飛星', ko: '지비성' }, { hanja: '地走星', ko: '지주성' }, { hanja: '地巧星', ko: '지교성' },
  { hanja: '地明星', ko: '지명성' }, { hanja: '地進星', ko: '지진성' }, { hanja: '地退星', ko: '지퇴성' },
  { hanja: '地滿星', ko: '지만성' }, { hanja: '地遂星', ko: '지수성' }, { hanja: '地周星', ko: '지주성' },
  { hanja: '地隱星', ko: '지은성' }, { hanja: '地異星', ko: '지이성' }, { hanja: '地理星', ko: '지리성' },
  { hanja: '地俊星', ko: '지준성' }, { hanja: '地樂星', ko: '지락성' }, { hanja: '地捷星', ko: '지첩성' },
  { hanja: '地速星', ko: '지속성' }, { hanja: '地鎮星', ko: '지진성' }, { hanja: '地羈星', ko: '지기성' },
  { hanja: '地魔星', ko: '지마성' }, { hanja: '地妖星', ko: '지요성' }, { hanja: '地幽星', ko: '지유성' },
  { hanja: '地伏星', ko: '지복성' }, { hanja: '地僻星', ko: '지벽성' }, { hanja: '地空星', ko: '지공성' },
  { hanja: '地孤星', ko: '지고성' }, { hanja: '地全星', ko: '지전성' }, { hanja: '地短星', ko: '지단성' },
  { hanja: '地角星', ko: '지각성' }, { hanja: '地囚星', ko: '지수성' }, { hanja: '地藏星', ko: '지장성' },
  { hanja: '地平星', ko: '지평성' }, { hanja: '地損星', ko: '지손성' }, { hanja: '地奴星', ko: '지노성' },
  { hanja: '地察星', ko: '지찰성' }, { hanja: '地惡星', ko: '지악성' }, { hanja: '地醜星', ko: '지추성' },
  { hanja: '地數星', ko: '지수성' }, { hanja: '地陰星', ko: '지음성' }, { hanja: '地刑星', ko: '지형성' },
  { hanja: '地壯星', ko: '지장성' }, { hanja: '地劣星', ko: '지열성' }, { hanja: '地健星', ko: '지건성' },
  { hanja: '地耗星', ko: '지모성' }, { hanja: '地賊星', ko: '지적성' }, { hanja: '地狗星', ko: '지구성' },
]

export const STARS: StarName[] = [...HEAVENLY, ...EARTHLY]

export const STAR_COUNT = STARS.length // 108
export const HEAVENLY_COUNT = HEAVENLY.length // 36

/** 화면 표기. 한국어는 「天魁星 천괴성」, 영어는 「天魁星 · Heavenly Spirit 1」 */
export function starLabel(index: number, locale: 'ko' | 'en'): { hanja: string; text: string } | null {
  const star = STARS[index]
  if (!star) return null
  if (locale === 'en') {
    const heavenly = index < HEAVENLY_COUNT
    const n = heavenly ? index + 1 : index - HEAVENLY_COUNT + 1
    return { hanja: star.hanja, text: heavenly ? `Heavenly Spirit ${n}` : `Earthly Fiend ${n}` }
  }
  return { hanja: star.hanja, text: star.ko }
}
