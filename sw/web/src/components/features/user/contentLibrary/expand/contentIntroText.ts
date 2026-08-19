const HTML_ENTITY_PATTERN = /&(#(?:x[\da-f]+|\d+)|amp|apos|gt|lt|nbsp|quot);/gi;

const NAMED_HTML_ENTITIES = {
  amp: "&",
  apos: "'",
  gt: ">",
  lt: "<",
  nbsp: " ",
  quot: '"',
} as const;

interface ContentIntroSource {
  description?: string | null;
}

/*
  소개문은 서버가 화면 언어에 맞는 것만 골라 description에 담아 준다.
  여기서 metadata를 다시 뒤지면 카카오·TMDB가 준 한국어 소개가 영문 화면에 그대로 나온다(26.08.19 사고).
*/
export function selectContentIntroText(brief: ContentIntroSource | null) {
  return brief?.description || null;
}

/**
 * DB에서 일반 문자열로 넘어온 HTML 엔티티만 텍스트로 복원한다.
 * 반환값은 FormattedText가 React 텍스트 노드로 렌더링하므로 HTML로 실행되지 않는다.
 */
export function decodeContentIntroEntities(text: string) {
  return text.replace(HTML_ENTITY_PATTERN, (source, entity: string) => {
    if (entity.startsWith("#")) {
      const isHex = entity[1]?.toLowerCase() === "x";
      const codePoint = Number.parseInt(entity.slice(isHex ? 2 : 1), isHex ? 16 : 10);

      const isUnicodeScalar =
        Number.isFinite(codePoint) &&
        codePoint >= 0 &&
        codePoint <= 0x10ffff &&
        !(codePoint >= 0xd800 && codePoint <= 0xdfff) &&
        codePoint !== 0;

      if (isUnicodeScalar) {
        return String.fromCodePoint(codePoint);
      }

      return source;
    }

    return (
      NAMED_HTML_ENTITIES[entity.toLowerCase() as keyof typeof NAMED_HTML_ENTITIES] ?? source
    );
  });
}

/** 소개 본문의 줄바꿈을 통일하고, 문단 사이에는 빈 줄 하나만 남긴다. */
export function normalizeContentIntroText(text: string) {
  return decodeContentIntroEntities(text)
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n(?:[ \t]*\n)+/g, "\n\n")
    .trim();
}
