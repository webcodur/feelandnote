import { normalizeContentIntroText } from './contentIntroText'

export function contentSourceHref(value?: string | null): string | null {
  if (!value) return null
  try {
    const url = new URL(value)
    return ['https:', 'http:'].includes(url.protocol) ? url.href : null
  } catch { return null }
}

/** 같은 언어·같은 소개 출처는 미리보기와 전문에서 같은 본문과 링크를 사용한다. */
export function resolveContentIntroduction(brief: {
  description?: string | null
  introductionAttribution?: { url?: string | null } | null
  introSources?: { provider: string; text: string; url: string }[] | null
} | null | undefined, provider?: string | null) {
  const source = brief?.introSources?.find(item => item.provider === provider) ?? brief?.introSources?.[0]
  const text = brief?.description?.trim() || source?.text?.trim() || null
  return {
    text: text ? normalizeContentIntroText(text) : null,
    sourceUrl: contentSourceHref(brief?.description?.trim() ? brief.introductionAttribution?.url : source?.url),
  }
}

export function resolveAppreciationText(locale: string, text?: string | null, textEn?: string | null) {
  return {
    text: (locale === 'en' ? textEn?.trim() || text?.trim() : text?.trim()) || null,
    originalLanguage: locale === 'en' && !textEn?.trim() && !!text?.trim(),
  }
}
