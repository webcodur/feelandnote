import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("./FictionCharactersSection.tsx", import.meta.url),
  "utf8",
);

test("작품 상세 인물 카드는 필터 없는 작은 아바타를 쓴다", () => {
  assert.match(source, /import CelebAvatarImage from/);
  assert.doesNotMatch(source, /<CelebImage\b/);
  assert.match(source, /className="relative w-12\b/);
  assert.match(source, /<CelebAvatarImage[\s\S]*?sizes="48px"/);
});

test("관계 배지 대신 독립된 이미지 확대 버튼을 둔다", () => {
  assert.doesNotMatch(source, /fictionRelation/);
  assert.match(source, /<Images\b/);
  assert.match(source, /<\/Link>\s*\{character\.avatarUrl \? \(\s*<button/);
  assert.match(source, /aria-haspopup="dialog"/);
  assert.match(source, /onClick=\{\(\) => setPreview\(character\)\}/);
  assert.match(source, /const ImageGalleryModal = dynamic/);
  assert.match(source, /src: preview\.avatarUrl/);

  const buttonStart = source.indexOf("<button");
  const buttonEnd = source.indexOf("</button>", buttonStart);
  const buttonSource = source.slice(buttonStart, buttonEnd);
  assert.doesNotMatch(buttonSource, /transition|duration|delay/);
});
