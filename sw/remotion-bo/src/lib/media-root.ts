/**
 * 시리즈 이름 → 에피소드 폴더 뿌리 — 서버 전용.
 *
 * 폴더 스캔·사진 정리·음원 목록 동작 자체는 공용 부품(@feelandnote/shared/bo/episode-store)에 있고,
 * 그 부품은 시리즈 이름을 모른다(뿌리 폴더만 인자로 받는다). 시리즈 레지스트리를 아는 이 앱이
 * 대응표를 가진다 — 관리 화면이 여러 앱으로 갈려도 부품은 그대로 쓰인다.
 */

import { FACTIONS_DIR, DISCOURSES_DIR } from '@feelandnote/shared/bo/episode-store'
import { seriesDataModel } from './series-registry'

/**
 * 이 시리즈의 에피소드 폴더 뿌리 — 같은 구조를 쓰지 않는 시리즈면 undefined.
 * 새 시리즈가 같은 구조를 쓰면 여기 한 줄만 더한다.
 */
export function mediaRootOf(series: string): string | undefined {
  switch (seriesDataModel(series)) {
    case 'faction': return FACTIONS_DIR
    case 'discourse': return DISCOURSES_DIR
    // 서재 탐방(book)은 책마다 폴더가 갈려 스캔 규칙이 다르다 — 자기 창구(api/[series]/images)를 쓴다
    default: return undefined
  }
}
