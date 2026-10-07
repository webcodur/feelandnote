// 작은따옴표 안의 축약형(don't)은 닫는 부호가 아니다 — 부호가 한글이 아닌 문자·숫자와 붙으면 닫지 않는다.
// 한국어는 ‘…’는처럼 닫는 부호 뒤에 조사가 바로 붙으므로 한글 뒤따름은 닫는 부호로 인정한다.
// 대시는 짝이 있는 삽입구만 강조한다.
// en dash는 양옆 공백으로 문장용 부호를 구분해 숫자 범위와 합성어를 보존한다.
const EMPHASIS_PATTERN = /("[^"\n]*"|“[^”\n]*”|(?<!(?![\uAC00-\uD7A3])[\p{L}\p{N}])'(?=\S)[^\n]*?'(?!(?![\uAC00-\uD7A3])[\p{L}\p{N}])|‘[^\n]*?’(?!(?![\uAC00-\uD7A3])[\p{L}\p{N}])|『[^』\n]*』|《[^》\n]*》|「[^」\n]*」|〈[^〉\n]*〉|<[^>\n]*>|—[^—\n.!?]+—|(?<=\s)–[^–\n.!?]+–(?=\s|[.,;:!?]|$)|(?<!-)--[^\n.!?]+?--(?!-)|(?<![\p{L}\p{N}\p{M}])\p{L}[\p{L}\p{N}\p{M}’'·-]*[ \t]*\((?=[^()\n]*\p{L})[^()\n]+\))/gu;
const TERM_PATTERN = /^(\p{L}[\p{L}\p{N}\p{M}’'·-]*)([ \t]*\(([^()\n]+)\))$/u;

// 긴 인용·삽입구는 본문으로 읽는다. 작품명·괄호 용어는 이 상한의 대상이 아니다.
const INLINE_EMPHASIS_MAX_LENGTH = 160;

function allowsEmphasis(matched: string): boolean {
  if (matched.startsWith("『") || matched.startsWith("《") || TERM_PATTERN.test(matched)) return true;
  return Array.from(matched).length - (matched.startsWith("--") ? 4 : 2) <= INLINE_EMPHASIS_MAX_LENGTH;
}

interface TextPart {
  text: string;
  emphasis: boolean;
  term?: "name" | "definition";
}

/** 강조(인용·용어·삽입구) 조각의 원문 범위 — 청크로 자를 때 강조 쌍이 경계에서 끊기지 않게 넘겨준다 */
export function emphasisSpans(text: string): { start: number; end: number }[] {
  return Array.from(text.matchAll(EMPHASIS_PATTERN))
    .filter((match) => allowsEmphasis(match[0]))
    .map((match) => ({ start: match.index, end: match.index + match[0].length }));
}

/** 문단에서 맞춘 강조 조각의 정규화 부호 — 경계로 잘린 조각 가장자리에 온전한 인용과 같은 부호를 다시 입힐 때 쓴다 */
export function emphasisDelimiters(matched: string): { open: string; close: string } | undefined {
  const first = matched[0];
  if (first === '"' || first === "“") return { open: "“", close: "”" };
  if (first === "'" || first === "‘" || first === "「" || first === "〈" || first === "<") return { open: "‘", close: "’" };
  if (first === "『" || first === "《") return { open: "《", close: "》" };
  return undefined; // 대시·용어는 원문 부호를 그대로 쓴다
}

/** 문단에서 맞춘 강조 조각의 클래스 — 경계로 잘린 조각은 부호 쌍을 못 보니 쌍째 텍스트로 판정한다. 아래 렌더의 부호 규칙과 같은 분류다 */
export function emphasisClassName(matched: string, highlightClassName?: string): string | undefined {
  if (!allowsEmphasis(matched)) return undefined;
  if (
    (matched.startsWith('"') && matched.endsWith('"')) ||
    (matched.startsWith("“") && matched.endsWith("”"))
  ) {
    return highlightClassName ? `font-semibold ${highlightClassName}` : "font-medium text-accent-hover";
  }
  if (
    (matched.startsWith('『') && matched.endsWith('』')) ||
    (matched.startsWith('《') && matched.endsWith('》'))
  ) {
    return highlightClassName ? `font-bold ${highlightClassName}` : "text-white font-bold";
  }
  if (
    (matched.startsWith('「') && matched.endsWith('」')) ||
    (matched.startsWith('〈') && matched.endsWith('〉')) ||
    (matched.startsWith('<') && matched.endsWith('>')) ||
    (matched.startsWith("'") && matched.endsWith("'")) ||
    (matched.startsWith("‘") && matched.endsWith("’")) ||
    (matched.startsWith("—") && matched.endsWith("—")) ||
    (matched.startsWith("–") && matched.endsWith("–")) ||
    (matched.startsWith("--") && matched.endsWith("--"))
  ) {
    return highlightClassName ? `font-medium ${highlightClassName}` : "font-serif text-accent";
  }
  // 용어는 이름·정의 굵기를 나눠야 해서 조각 강조를 지원하지 않는다 — 문장을 가르는 일이 없어 방어하지 않는다
  return undefined;
}

export function splitEmphasis(text: string): TextPart[] {
  const parts = text.split(EMPHASIS_PATTERN);
  const result: TextPart[] = [];
  for (let i = 0; i < parts.length; i++) {
    const term = i % 2 === 1 ? parts[i].match(TERM_PATTERN) : null;
    if (!term) {
      result.push({ text: parts[i], emphasis: i % 2 === 1 && allowsEmphasis(parts[i]) });
      continue;
    }

    let name = term[1];
    const acronym = term[3];
    const previous = result.at(-1);
    // AI·CBT처럼 약칭의 머리글자가 맞을 때만 앞의 여러 영어 단어를 용어에 포함한다.
    if (/^[A-Z]{2,}$/.test(acronym) && previous && !previous.emphasis) {
      const words = Array.from(previous.text.matchAll(/[A-Za-z][A-Za-z'’-]*[ \t]+/g)).slice(-(acronym.length - 1));
      const start = words[0]?.index;
      const prefix = start === undefined ? "" : previous.text.slice(start);
      const initials = [...words.map((word) => word[0][0]), name[0]].join("").toUpperCase();
      if (initials === acronym && words.map((word) => word[0]).join("") === prefix) {
        name = prefix + name;
        previous.text = previous.text.slice(0, start);
      }
    }
    result.push({ text: name, emphasis: true, term: "name" });
    result.push({ text: term[2], emphasis: true, term: "definition" });
  }
  return result;
}
