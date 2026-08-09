/**
 * celebs.slug generated column의 화면 미리보기.
 * DB generation_expression의 translate → trim → lower → ASCII 공백 치환을 그대로 재현한다.
 */
export function previewGeneratedCelebSlug(value: string): string {
  const source = 'ÀÁÂÃÄÅàáâãäåÇçÈÉÊËèéêëÌÍÎÏìíîïÑñÒÓÔÕÖØòóôõöøŌōÙÚÛÜùúûüÝýŸÿĆćČčŠšŽžŘř'
  const target = 'AAAAAAaaaaaaCcEEEEeeeeIIIIiiiiNnOOOOOOooooooOoUUUUuuuuYyYyCcCcSsZzRr'
  const translated = [...value].map(char => {
    const index = source.indexOf(char)
    return index >= 0 ? target[index] ?? '' : char
  }).join('')
  return translated.replace(/^ +| +$/g, '').toLowerCase().replace(/ /g, '-')
}

/** slash·query·fragment 문자는 동적 라우트의 한 세그먼트를 깨므로 신규 프로필에서 금지한다. */
export function assertRouteSafeCelebSlug(slug: string): string {
  if (!slug || /[/\\?#]/.test(slug)) {
    throw new Error(`생성된 slug를 URL 경로로 사용할 수 없습니다: ${slug || '(비어 있음)'}`)
  }
  return slug
}
