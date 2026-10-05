import { load } from "cheerio";
import { restoreVerifiedWordLayout } from "./introductionWordLayout";
export { cleanIntroductionFormatting } from "../utils/introduction-formatting";

const INTRO_HTML_TAGS = new Set("a b br blockquote center cite code del div em font h1 h2 h3 h4 h5 h6 hr i iframe img li ol p pre s script small span strike strong style sub sup table tbody td th thead tr u ul".split(" "));

function preserveTitleTags(html: string): string {
  return html.replace(/<\/?([a-z][a-z\d-]*)\b[^>]*>/gi, (tag, name: string) => INTRO_HTML_TAGS.has(name.toLowerCase())
    ? tag : tag.replace(/</g, "&lt;").replace(/>/g, "&gt;"));
}

function whitespaceGaps(text: string): Map<number, string> {
  const gaps = new Map<number, string>();
  let position = 0;
  for (let i = 0; i < text.length; i++) {
    if (/\s/.test(text[i])) gaps.set(position, (gaps.get(position) ?? "") + text[i]);
    else position++;
  }
  return gaps;
}

function sameWordSpaces(source: string, reference: string, length: number): boolean {
  const a = whitespaceGaps(source), b = whitespaceGaps(reference);
  const characters = source.replace(/\s/g, "");
  for (let i = 1; i < length; i++) {
    const left = a.get(i) ?? "", right = b.get(i) ?? "";
    if (!left && /\r?\n[\t ]*\r?\n/.test(right)
      && /[\p{L}\p{N}]/u.test(characters[i - 1]) && /[\p{L}\p{N}]/u.test(characters[i])) return false;
    if (!/[\r\n]/.test(left + right) && Boolean(left) !== Boolean(right)) return false;
  }
  return true;
}

/** 짝이 닫힌 제목 부호의 표시 방식만 대조용으로 통일한다. 출력 부호는 원문을 쓴다. */
function comparableBookBrackets(text: string): string {
  return text
    .replace(/『([^『』《》]+)』/g, "《$1》")
    .replace(/〈([^〈〉<>「」[\]]+)〉/g, "<$1>")
    .replace(/「([^〈〉<>「」[\]]+)」/g, "<$1>")
    .replace(/\[([^[\]<>〈〉「」]+)\]/g, "<$1>");
}

function indexText(text: string) {
  const offsets: number[] = [];
  let compact = "";
  for (let i = 0; i < text.length; i++) {
    if (!/\s/.test(text[i])) { compact += text[i]; offsets.push(i); }
  }
  return { text, offsets, compact: comparableBookBrackets(compact) };
}

function uniqueIndex(text: string, part: string): number {
  const start = text.indexOf(part);
  return start >= 0 && text.indexOf(part, start + 1) < 0 ? start : -1;
}

function addReferenceParagraphGaps(source: string, reference: string): string {
  const indexed = indexText(source);
  const edits: { start: number; end: number }[] = [];
  for (const [position, gap] of whitespaceGaps(reference)) {
    if (position === 0 || position >= indexed.offsets.length || !/\r?\n[\t ]*\r?\n/.test(gap)) continue;
    const start = indexed.offsets[position - 1] + 1, end = indexed.offsets[position];
    if (!/\r?\n[\t ]*\r?\n/.test(source.slice(start, end))) edits.push({ start, end });
  }
  let output = source;
  for (const edit of edits.sort((a, b) => b.start - a.start)) {
    output = output.slice(0, edit.start) + "\n\n" + output.slice(edit.end);
  }
  return output;
}

/** 여러 소개가 섞여 있어도, 참조의 연속된 두 문단 전문이 일치하는 경계만 추가한다. */
function restoreVerifiedParagraphPairs(source: string, references: readonly string[]): string | null {
  const indexed = indexText(source);
  const referenceIndexes = references.map(indexText);
  const boundaries = new Map<number, { start: number; end: number }>();
  const paragraphGap = /\r?\n[\t ]*\r?\n/;
  for (const reference of references) {
    const paragraphs = reference.split(/\r?\n[\t ]*\r?\n(?:[\t ]*\r?\n)*/).map(value => value.trim()).filter(Boolean);
    for (let i = 0; i < paragraphs.length - 1; i++) {
      const pair = `${paragraphs[i]}\n\n${paragraphs[i + 1]}`;
      const pairIndex = indexText(pair);
      const start = uniqueIndex(indexed.compact, pairIndex.compact);
      if (start < 0) continue;
      const end = start + pairIndex.compact.length;
      const sliceStart = indexed.offsets[start], sliceEnd = indexed.offsets[end - 1] + 1;
      // 다른 단어 중간에 우연히 일치한 구절을 문단으로 취급하지 않는다.
      if ((sliceStart > 0 && /[\p{L}\p{N}]/u.test(source[sliceStart - 1]))
        || (sliceEnd < source.length && /[\p{L}\p{N}]/u.test(source[sliceEnd]))) continue;
      if (!sameWordSpaces(source.slice(sliceStart, sliceEnd), pair, pairIndex.compact.length)) continue;
      const leftLength = paragraphs[i].replace(/\s/g, "").length;
      const gapStart = indexed.offsets[start + leftLength - 1] + 1;
      const gapEnd = indexed.offsets[start + leftLength];
      if (paragraphGap.test(source.slice(gapStart, gapEnd))) continue;
      if (gapStart === gapEnd && /[\p{L}\p{N}]/u.test(source[gapStart - 1]) && /[\p{L}\p{N}]/u.test(source[gapEnd])) continue;
      // 다른 참조가 같은 두 문단을 한 문단으로 제시하면 그 경계를 채택하지 않는다.
      const conflict = referenceIndexes.some(other => {
        const at = uniqueIndex(other.compact, pairIndex.compact);
        if (at < 0) return false;
        const gap = other.text.slice(other.offsets[at + leftLength - 1] + 1, other.offsets[at + leftLength]);
        return !paragraphGap.test(gap);
      });
      if (!conflict) boundaries.set(gapStart, { start: gapStart, end: gapEnd });
    }
  }
  if (!boundaries.size) return null;
  let output = source;
  for (const boundary of [...boundaries.values()].sort((a, b) => b.start - a.start)) {
    output = output.slice(0, boundary.start) + "\n\n" + output.slice(boundary.end);
  }
  return output;
}

/** 같은 판본의 소개·출판사 리뷰 본문만 읽는다. 인접 목차·독자 리뷰는 후보가 아니다. */
export function extractYes24LayoutReferences(html: string, isbn: string): string[] {
  const $ = load(html);
  const pageIsbn = $("th").filter((_, el) => $(el).text().trim() === "ISBN13").first().next("td").text().trim();
  if (pageIsbn !== isbn) return [];
  return $("#infoset_introduce textarea.txtContentText, #infoset_pubReivew textarea.txtContentText")
    .toArray().flatMap(el => {
      // textarea 안의 실제 개행과 HTML 개행을 모두 보존한다.
      const body = load(preserveTitleTags($(el).text()).replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/(?:p|div|li|h[1-6])\s*>/gi, "\n\n"), null, false);
      body("script,style").remove();
      const value = body.text().replace(/\r\n?/g, "\n").replace(/[\t ]+\n/g, "\n")
        .replace(/\n[\t ]+/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
      return value ? [value] : [];
    });
}

/**
 * 원문 전체가 참조 본문의 단일 연속 범위에 일치할 때 누락된 문단 간격만 추가한다.
 * 닫힌 제목 부호(《》/『』, 〈〉/<>/「」/[])만 동등하게 대조한다.
 * 출력의 글자·부호는 전부 원문에서 가져온다.
 * 원문에 있던 문단·인용·목록의 줄바꿈은 참조와 달라도 지우지 않는다.
 * 부호가 다른 자료는 본문 전체의 글자·단어 경계를 대조하고 확인된 간격만 추가한다.
 * 내용이 다른 자료는 연속된 참조 두 문단의 전문이 일치하는 경계만 복원한다.
 * 부분 문장·유사도는 쓰지 않는다. 다른 참조가 서로 다른 경계를 주면 보류한다.
 */
export function restoreIntroductionLayout(source: string, references: readonly string[]): string | null {
  const compact = source.replace(/\s/g, "");
  if (!compact) return null;
  const comparable = comparableBookBrackets(compact);
  const candidates = new Set<string>();
  for (const reference of references) {
    const offsets: number[] = [];
    let plain = "";
    // UTF-16 범위를 사용해 이모지와 낭독 오프셋도 원문 기준을 유지한다.
    for (let i = 0; i < reference.length; i++) {
      if (!/\s/.test(reference[i])) { plain += reference[i]; offsets.push(i); }
    }
    const comparableReference = comparableBookBrackets(plain);
    const start = comparableReference.indexOf(comparable);
    if (start < 0 || comparableReference.indexOf(comparable, start + 1) >= 0) continue;
    const matched = reference.slice(offsets[start], offsets[start + compact.length - 1] + 1);
    if (comparableBookBrackets(matched.replace(/\s/g, "")) === comparable && sameWordSpaces(source, matched, compact.length)) {
      candidates.add(addReferenceParagraphGaps(source, matched));
    }
  }
  if (candidates.size) return candidates.size === 1 ? [...candidates][0] : null;
  return restoreVerifiedWordLayout(source, references, comparableBookBrackets)
    ?? restoreVerifiedParagraphPairs(source, references);
}
