/** 편집 언어 모드 — 입력칸의 노출 언어를 가린다(한국어만 / 영어만 / 둘 다). 팩션 EditLang 과 같은 어휘 */
export type EditLang = 'ko' | 'en' | 'both'

export const EDIT_LANGS: [EditLang, string][] = [['ko', '한국어'], ['en', 'English'], ['both', '둘 다']]
