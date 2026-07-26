/**
 * 가상 담화 로컬 자산 경로 — 서버 전용.
 *
 * 실제 규칙은 공용 부품 `@feelandnote/shared/bo/episode-store` 한 곳에 있다.
 * 이 파일은 뿌리 폴더(public/discourses/)만 채워 넘기는 얇은 껍데기다 — 규칙을 여기에 복제하지 않는다.
 */

import path from 'path'
import {
  DISCOURSES_DIR, episodeDirOf, voiceDirOf, safeDirName, listVoices,
} from '@feelandnote/shared/bo/episode-store'

export { DISCOURSES_DIR }

/**
 * 이 앱의 담화 창구가 쓰는 시리즈 이름 — 공용 부품이 주소를 만들 때 쓴다(`/api/discourse/...`).
 * 사진 부품(`shared/bo/media`)이 `/api/{시리즈}/media` 를 하드코딩하므로, 이 값을 주소 첫 토막에
 * 그대로 두면 그 부품을 한 줄도 고치지 않고 쓴다(팩션과 같은 판단).
 */
export const DISCOURSE_SERIES = 'discourse'

/** 에피소드 폴더 — public/discourses/{name}/ */
export const discourseEpisodeDir = (name: string) => episodeDirOf(DISCOURSES_DIR, name)

/** 음성 폴더 — public/discourses/{name}/voice/ */
export const discourseVoiceDir = (name: string) => voiceDirOf(DISCOURSES_DIR, name)

/**
 * 음성 파일 절대경로 — 파일명만 취해 경로 이탈을 막는다.
 *
 * ⚠ 팩션(`safeFilename`)과 달리 `safeDirName` 을 쓴다. 담화 음원 파일명이 ASCII 로 한정되지
 *   않아서다(remotion-bo `discourse-utils.ts:110` 이 같은 판단을 했다). 경로 구분자·상위 이동은
 *   똑같이 걷어낸다.
 */
export const discourseVoiceFilePath = (name: string, file: string) =>
  path.join(discourseVoiceDir(name), safeDirName(file))

/** 에피소드 voice/ 폴더의 발언 wav 목록 (이름·크기·길이) */
export const listDiscourseVoices = (name: string) => listVoices(DISCOURSES_DIR, name)
