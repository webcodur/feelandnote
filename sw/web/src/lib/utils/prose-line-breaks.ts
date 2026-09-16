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
