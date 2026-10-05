/**
 * 작성자가 넣은 빈 줄은 그대로 문단 경계로 쓴다.
 * 오래된 단일 문단 데이터가 지나치게 길 때만 문장 경계에서 두 덩어리로 나눠 읽기 폭을 줄인다.
 */
export function splitReadableParagraphs(text: string | null | undefined): string[] {
  const normalized = text?.replace(/\r\n?/g, "\n").trim();
  if (!normalized) return [];

  const authoredParagraphs = normalized
    .split(/\n\s*\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  if (authoredParagraphs.length > 1 || normalized.length < 360) {
    return authoredParagraphs;
  }

  const sentences = normalized
    .match(/[^.!?。]+(?:[.!?。]+[”’"'」』》]*|$)/g)
    ?.map((sentence) => sentence.trim())
    .filter(Boolean);

  if (!sentences || sentences.length < 4) return authoredParagraphs;

  const totalLength = sentences.reduce((sum, sentence) => sum + sentence.length, 0);
  let leftLength = 0;
  let splitAt = 2;
  let closestDistance = Number.POSITIVE_INFINITY;

  for (let index = 0; index < sentences.length - 2; index += 1) {
    leftLength += sentences[index].length;
    if (index < 1) continue;

    const distance = Math.abs(totalLength / 2 - leftLength);
    if (distance < closestDistance) {
      closestDistance = distance;
      splitAt = index + 1;
    }
  }

  return [sentences.slice(0, splitAt).join(" "), sentences.slice(splitAt).join(" ")];
}
export type TextBlock =
  | { kind: "paragraph"; text: string; start: number; end: number }
  | { kind: "heading"; text: string; start: number; end: number }
  | { kind: "section"; start: number; end: number };

/** 원문 범위로 자른다. 빈 줄의 수나 문장 끝으로 큰 구획을 추측하지 않는다. */
export function splitTextBlocks(text: string): TextBlock[] {
  const blocks: TextBlock[] = [];
  const boundaries = /^[\t ]*⁋[^\r\n]*\r?$|^[\t ]*(?:-{3,}|-(?:[\t ]+-){2,})[\t ]*\r?$|\r?\n[\t ]*\r?\n(?:[\t ]*\r?\n)*/gm;
  let cursor = 0;
  const append = (end: number) => {
    const raw = text.slice(cursor, end);
    const leading = raw.match(/^[\r\n]*/)?.[0].length ?? 0;
    const value = raw.slice(leading).replace(/[\r\n]+$/, "");
    if (value.trim()) blocks.push({ kind: "paragraph", text: value, start: cursor + leading, end: cursor + leading + value.length });
  };
  for (const match of text.matchAll(boundaries)) {
    append(match.index);
    if (match[0].trim() && blocks.length && blocks.at(-1)?.kind !== "section") {
      blocks.push({ kind: "section", start: match.index, end: match.index + match[0].length });
    }
    const headingPrefix = match[0].match(/^[\t ]*⁋[\t ]*/)?.[0];
    if (headingPrefix) {
      const value = match[0].slice(headingPrefix.length).replace(/\r$/, "");
      if (value.trim()) blocks.push({ kind: "heading", text: value, start: match.index + headingPrefix.length, end: match.index + headingPrefix.length + value.length });
    }
    cursor = match.index + match[0].length;
  }
  append(text.length);
  if (blocks.at(-1)?.kind === "section") blocks.pop();
  return blocks;
}
