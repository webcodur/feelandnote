import assert from "node:assert/strict";
import test from "node:test";

import {
  dropForeignDisplayText,
  pickIntroForLocale,
  stripLocalizedMeta,
} from "./content-locale-text";

test("영문 화면은 한국어 소개를 건너뛰고 다음 후보를 쓴다", () => {
  assert.equal(
    pickIntroForLocale("en", ["  ", "한국어 줄거리입니다", "An English synopsis"]),
    "An English synopsis",
  );
  assert.equal(pickIntroForLocale("en", ["한국어 줄거리입니다"]), null);
});

test("국문 화면은 후보를 언어로 거르지 않는다", () => {
  assert.equal(pickIntroForLocale("ko", ["한국어 줄거리입니다"]), "한국어 줄거리입니다");
  assert.equal(pickIntroForLocale("ko", [null, "English only"]), "English only");
});

test("영문 화면에서는 저장된 ko 메타를 덜어 내 외부 영문 값을 살린다", () => {
  const stored = { overview: "한국어 줄거리", genres: ["코미디"], runtime: 92 };
  assert.deepEqual(stripLocalizedMeta("en", stored), { runtime: 92 });
  assert.deepEqual(stripLocalizedMeta("ko", stored), stored);
});

test("병합을 마친 메타에서 한국어가 남은 표시값을 버린다", () => {
  const merged = {
    description: "한국어 소개",
    genres: ["코미디", "드라마"],
    publisher: "민음사",
    runtime: 92,
  };
  assert.deepEqual(dropForeignDisplayText("en", merged), { runtime: 92 });
  assert.deepEqual(dropForeignDisplayText("ko", merged), merged);
});

test("영문 값은 그대로 남긴다", () => {
  const merged = { description: "An English synopsis", genres: ["Comedy"], publisher: "Vintage" };
  assert.deepEqual(dropForeignDisplayText("en", merged), merged);
});
