// 사용자 웹의 본문 서식(FormattedText)은 마크다운을 해석하지 않는다. Argon 등 모델이 영문 작품명에 붙인
// *제목*·**강조** 기호는 화면에 별표로 그대로 나오므로 저장 전에 걷어낸다(26.10.29 영문 감상 888건·본문 64건 정리).
// 낱말 안의 별표(IZ*ONE, M*A*S*H, f***ing)와 짝이 맞지 않는 별표는 원문대로 둔다.
const MARKDOWN_EMPHASIS = /(?<![\p{L}\p{N}*])(\*{1,2})(?=[^\s*])((?:[^*\n]|(?<=\p{L})\*(?=\p{L}))+?)(?<=\S)\1(?![\p{L}\p{N}*])/gu;

export function stripMarkdownEmphasis(text) {
  return typeof text === 'string' ? text.replace(MARKDOWN_EMPHASIS, '$2') : text;
}
