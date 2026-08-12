import assert from "node:assert/strict";
import test from "node:test";

import { normalizeContentIntroText, selectContentIntroText } from "./contentIntroText";

test("받은 metadata.description을 책 소개로 선택한다", () => {
  assert.equal(
    selectContentIntroText({
      description: null,
      metadata: { description: "외부 메타데이터에서 받은 책 소개" },
    }),
    "외부 메타데이터에서 받은 책 소개",
  );
});

test("책 소개의 HTML 엔티티를 일반 텍스트로 복원한다", () => {
  assert.equal(
    normalizeContentIntroText("1991년 조사에서 &lt;아틀라스&gt;가 꼽혔다. &#38; 기록"),
    "1991년 조사에서 <아틀라스>가 꼽혔다. & 기록",
  );
});

test("연속된 빈 줄은 문단 사이 한 줄만 남긴다", () => {
  assert.equal(normalizeContentIntroText("첫 문단\r\n\r\n\r\n\r\n둘째 문단"), "첫 문단\n\n둘째 문단");
});

test("NUL과 단독 surrogate 엔티티는 텍스트에 삽입하지 않는다", () => {
  assert.equal(normalizeContentIntroText("앞&#0;뒤 &#xD800;"), "앞&#0;뒤 &#xD800;");
});
