/** 음원 파일 한 개의 메타 — /api/{series}/discourse-voice/{episode} 응답 항목 */
export interface DiscourseVoiceMeta {
  file: string
  size: number
  /** 초 */
  duration: number
}
