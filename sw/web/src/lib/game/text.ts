/** 게임에서 괄호 안 한자 병기와 한글에 바로 붙은 한자 병기를 생략한다. */
export function gameText(text: string): string {
  return text
    .replace(/\([^()]*\p{Script=Han}[^()]*\)|（[^（）]*\p{Script=Han}[^（）]*）/gu, '')
    .replace(/(?<=[가-힣])\p{Script=Han}+/gu, '');
}
