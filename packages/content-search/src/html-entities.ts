const HTML_ENTITY_PATTERN = /&(#(?:x[\da-f]+|\d+)|amp|apos|gt|lt|nbsp|quot);/gi
const NAMED_HTML_ENTITIES: { [name: string]: string } = {
  amp: '&', apos: "'", gt: '>', lt: '<', nbsp: ' ', quot: '"',
}

// 외부 메타와 저장된 제목의 문자 코드만 복원한다. HTML을 렌더링하지 않는다.
export function decodeHtmlEntities(text: string): string {
  return text.replace(HTML_ENTITY_PATTERN, (source, entity: string) => {
    if (!entity.startsWith('#')) return NAMED_HTML_ENTITIES[entity.toLowerCase()] ?? source
    const isHex = entity[1]?.toLowerCase() === 'x'
    const codePoint = Number.parseInt(entity.slice(isHex ? 2 : 1), isHex ? 16 : 10)
    return codePoint > 0 && codePoint <= 0x10ffff && !(codePoint >= 0xd800 && codePoint <= 0xdfff)
      ? String.fromCodePoint(codePoint)
      : source
  })
}
