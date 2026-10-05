/** 본문 전체의 글자·숫자·기호 순서와 단어 경계가 일치할 때, 확인된 문단 간격만 추가한다. */
export function restoreVerifiedWordLayout(
  source: string, references: readonly string[], normalizeDelimiters: (text: string) => string,
): string | null {
  const hasSeparator = (gap: string) => Boolean(gap.replace(/[‘’“”"'《》〈〉「」『』<>()[\]]/g, ""));
  const closedTitles = (text: string) => {
    const closers: Record<string, string> = { "《": "》", "〈": "〉", "「": "」", "『": "』", "[": "]" };
    const expected: string[] = [];
    for (const [character] of text.matchAll(/[《》〈〉「」『』\[\]]/g)) {
      if (closers[character]) expected.push(closers[character]);
      else if (expected.pop() !== character) return false;
    }
    return expected.length === 0;
  };
  if (!closedTitles(source)) return null;
  function index(text: string) {
    const comparable = normalizeDelimiters(text);
    const titleAngles = new Set<number>();
    for (const pair of comparable.matchAll(/<[^<>]+>/g)) {
      titleAngles.add(pair.index); titleAngles.add(pair.index + pair[0].length - 1);
    }
    const offsets: number[] = [];
    let words = "";
    for (let i = 0; i < comparable.length; i++) {
      if (!titleAngles.has(i) && !/[\s\p{P}]/u.test(comparable[i])) { words += comparable[i]; offsets.push(i); }
    }
    return { text, words, offsets };
  }
  const original = index(source);
  if (!original.words) return null;
  const votes = new Map<number, Set<boolean>>();
  for (const reference of references) {
    if (!closedTitles(reference)) continue;
    const candidate = index(reference);
    const at = candidate.words.indexOf(original.words);
    if (at < 0 || candidate.words.indexOf(original.words, at + 1) >= 0) continue;
    const start = candidate.offsets[at], end = candidate.offsets[at + original.words.length - 1] + 1;
    if ((start > 0 && /[\p{L}\p{N}]/u.test(reference[start - 1]))
      || (end < reference.length && /[\p{L}\p{N}]/u.test(reference[end]))) continue;
    const gaps: { ordinal: number; paragraph: boolean }[] = [];
    let matching = true;
    for (let i = 1; i < original.words.length; i++) {
      const sourceGap = source.slice(original.offsets[i - 1] + 1, original.offsets[i]);
      const referenceGap = reference.slice(candidate.offsets[at + i - 1] + 1, candidate.offsets[at + i]);
      if (!sourceGap && /\r?\n[\t ]*\r?\n/.test(referenceGap)) {
        matching = false; break;
      }
      // nowhere / now here처럼 다른 단어 경계는 거부한다. 한 줄 개행은 원문의 줄바꿈일 수 있다.
      if (!/[\r\n]/.test(sourceGap + referenceGap) && hasSeparator(sourceGap) !== hasSeparator(referenceGap)) {
        matching = false; break;
      }
      gaps.push({ ordinal: i, paragraph: /\r?\n[\t ]*\r?\n/.test(referenceGap) });
    }
    if (!matching) continue;
    for (const gap of gaps) {
      if (!votes.has(gap.ordinal)) votes.set(gap.ordinal, new Set());
      votes.get(gap.ordinal)!.add(gap.paragraph);
    }
  }
  const edits: { start: number; end: number }[] = [];
  for (const [ordinal, evidence] of votes) {
    if (!evidence.has(true) || evidence.has(false)) continue;
    const start = original.offsets[ordinal - 1] + 1, end = original.offsets[ordinal];
    const gap = source.slice(start, end);
    if (/\r?\n[\t ]*\r?\n/.test(gap)) continue;
    const whitespace = [...gap.matchAll(/\s+/g)];
    const lineBreaks = whitespace.filter(match => /[\r\n]/.test(match[0]));
    const anchors = lineBreaks.length ? lineBreaks : whitespace;
    // 부호 앞뒤에 공백 후보가 여러 개면 어느 위치에서 문단을 나눌지 추측하지 않는다.
    if (anchors.length !== 1) continue;
    edits.push({ start: start + anchors[0].index, end: start + anchors[0].index + anchors[0][0].length });
  }
  if (!edits.length) return null;
  let output = source;
  for (const edit of edits.sort((a, b) => b.start - a.start)) {
    output = output.slice(0, edit.start) + "\n\n" + output.slice(edit.end);
  }
  return output;
}
