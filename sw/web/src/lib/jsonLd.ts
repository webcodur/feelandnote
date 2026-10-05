/** JSON-LD를 script에 넣어도 HTML 파서가 본문 속 태그·주석을 해석하지 않게 한다. */
export function serializeJsonLd(value: object): string {
  return JSON.stringify(value).replace(/</g, '\\u003c').replace(/>/g, '\\u003e');
}
