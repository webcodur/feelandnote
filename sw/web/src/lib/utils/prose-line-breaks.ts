/*
  문장이 여러 개 이어진 줄 사이의 한 줄 개행만 빈 줄(문단 경계)로 넓힌다.
  - 빈 줄이 하나라도 있으면 작성자가 이미 문단을 나눈 글이다. 남은 한 줄 개행은 시 구절·질문 나열·강제 줄바꿈이라 손대지 않는다
  - 앞뒤 줄이 모두 문장부호로 끝나고 두 문장 이상이어야 한다. 한 줄에 한 항목씩 적은 목록(수록작·목차)과 한 문장씩 끊은 글은 그대로 둔다
  - 목록 기호(-, •, 1.)나 출처 표시(_, —)로 시작하는 줄은 문장 줄로 치지 않는다. 인용과 출처가 떨어지지 않는다
*/

const LIST_MARKER = /^(?:[-–—•·*_▶►■□◆◇○●※☞]|\d+[.)]\s|[①-⑳])/;
const LINE_END = /[.!?。…][”’"'」』》)\]]*$/;
// 숫자 뒤 마침표(1. 2.)는 문장 끝이 아니다
const SENTENCE_END = /[^\s\d][.!?。…]+[”’"'」』》)\]]*(?=\s|$)/g;

function isProseLine(line: string): boolean {
  const text = line.trim();
  return !LIST_MARKER.test(text) && LINE_END.test(text) && (text.match(SENTENCE_END)?.length ?? 0) >= 2;
}

export function doubleProseLineBreaks(text: string): string {
  const normalized = text.replace(/\r\n?/g, "\n");
  if (/\n[^\S\n]*\n/.test(normalized)) return normalized;

  const lines = normalized.split("\n");
  return lines
    .map((line, index) => {
      if (index === 0) return line;
      return (isProseLine(lines[index - 1]) && isProseLine(line) ? "\n\n" : "\n") + line;
    })
    .join("");
}

/*
  공급처마다 다른 개행 표기를 화면 규약(\n = 붙는 줄, \n\n = 문단)으로 맞춘다.
  - 개행 셋 이상(\n{3,}): 원본이 덩어리 경계로 강하게 표시한 간격이다. 비문장 줄 사이에 와도 항상 문단으로 둔다
  - 빈 줄 하나(\n\n): 앞뒤가 모두 문장부호 없이 끝나는 줄이면 시 구절·수록작 나열·헤드라인 류로 보고 붙는 줄로 내린다.
    다음 줄만 목록 기호로 시작하면(▶ 소제목 등) 떼어 둔다
  - 빈 줄이 없는 글: 산문 줄 사이의 한 줄 개행만 벌린다(doubleProseLineBreaks)
*/
function isBareLine(line: string): boolean {
  const text = line.trim();
  return text !== "" && !LINE_END.test(text);
}

function lastLineOf(chunk: string): string {
  return chunk.slice(chunk.lastIndexOf("\n") + 1);
}

function firstLineOf(chunk: string): string {
  const end = chunk.indexOf("\n");
  return end === -1 ? chunk : chunk.slice(0, end);
}

export function normalizeIntroBreaks(text: string): string {
  const normalized = text
    .replace(/\r\n?/g, "\n")
    .replace(/[^\S\n]+\n/g, "\n")
    .replace(/\n[^\S\n]+/g, "\n");

  const chunks = normalized.split(/(\n{2,})/);
  const joined = chunks
    .map((chunk, index) => {
      if (index % 2 === 0) return chunk;
      if (chunk.length > 2) return "\n\n\n";
      const prev = lastLineOf(chunks[index - 1]);
      const next = firstLineOf(chunks[index + 1] ?? "");
      const nextIsHeading = LIST_MARKER.test(next.trim()) && !LIST_MARKER.test(prev.trim());
      return isBareLine(prev) && isBareLine(next) && !nextIsHeading ? "\n" : "\n\n";
    })
    .join("");

  return doubleProseLineBreaks(joined.replace(/\n{3,}/g, "\n\n")).trim();
}
