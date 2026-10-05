/** 속성이 있는 닫힌 font 서식만 제거한다. 제목 괄호와 불완전한 표기는 보존한다. */
export function cleanIntroductionFormatting(text: string): string {
  const font = /[<〈]font(?:\s+(?:color|face|size)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>〉]+))+\s*[>〉]([\s\S]*?)[<〈]\/font\s*[>〉]/gi;
  let previous: string;
  do { previous = text; text = text.replace(font, "$1"); } while (text !== previous);
  return text;
}
