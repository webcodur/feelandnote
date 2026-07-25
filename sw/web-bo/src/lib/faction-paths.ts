/**
 * 세력도 로컬 자산 경로 — 서버 전용.
 *
 * 실제 규칙은 공용 부품 `@feelandnote/shared/bo/episode-store` 한 곳에 있다.
 * 이 파일은 뿌리 폴더(public/factions/)만 채워 넘기는 얇은 껍데기다 — 규칙을 여기에 복제하지 않는다.
 */

import path from 'path'
import {
  FACTIONS_DIR, episodeDirOf, voiceDirOf, safeFilename, listVoices,
} from '@feelandnote/shared/bo/episode-store'

export { FACTIONS_DIR }

/** 이 앱의 세력도 창구가 쓰는 시리즈 이름 — 공용 부품이 주소를 만들 때 쓴다(`/api/faction/...`) */
export const FACTION_SERIES = 'faction'

/** 에피소드 폴더 — public/factions/{name}/ */
export const factionEpisodeDir = (name: string) => episodeDirOf(FACTIONS_DIR, name)

/** 음성 폴더 — public/factions/{name}/voice/ */
export const factionVoiceDir = (name: string) => voiceDirOf(FACTIONS_DIR, name)

/** 음성 파일 절대경로 — 파일명만 취해 경로 이탈을 막는다 */
export const factionVoiceFilePath = (name: string, file: string) =>
  path.join(factionVoiceDir(name), safeFilename(file))

/** 에피소드 voice/ 폴더의 인물 대사 wav 목록 (이름·크기·길이) */
export const listFactionVoices = (name: string) => listVoices(FACTIONS_DIR, name)
