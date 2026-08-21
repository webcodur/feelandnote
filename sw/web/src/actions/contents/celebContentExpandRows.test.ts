import assert from "node:assert/strict";
import test from "node:test";

import { mapCelebIndexRow, mapCelebRecordRow } from "./celebContentExpandRows";

const row = {
  id: "record-1",
  content_id: "content-1",
  status: "FINISHED",
  visibility: "public",
  created_at: "2026-08-21T00:00:00.000Z",
  review: "A considered review",
  review_en: "English review",
  review_presets: ["POS_01"],
  is_spoiler: false,
  source_url: "https://example.com/source",
  content: {
    id: "content-1",
    type: "GAME",
    metadata: { developer: "Studio", screenshots: ["https://example.com/1.jpg"] },
    user_count: 12,
    content_locales: [
      { locale: "ko", title: "테스트 게임", creator: "개발사", thumbnail_url: "ko.jpg" },
      { locale: "en", title: "Test Game", creator: "Studio", thumbnail_url: "en.jpg" },
    ],
  },
};

test("thin index keeps navigation fields and drops selected-only payload", () => {
  const result = mapCelebIndexRow(row, "ko");
  assert.ok(result);
  assert.equal(result.content.title, "테스트 게임");
  assert.equal(result.content.type, "GAME");
  assert.equal(result.content.metadata, null);
  assert.equal(result.content.user_count, null);
  assert.equal(result.source_url, null);
  assert.equal(result.public_record, null);
});

test("selected record restores review, source and metadata", () => {
  const result = mapCelebRecordRow(row, "en");
  assert.ok(result);
  assert.equal(result.content.title, "Test Game");
  assert.deepEqual(result.content.metadata, row.content.metadata);
  assert.equal(result.content.user_count, 12);
  assert.equal(result.source_url, row.source_url);
  assert.equal(result.public_record?.content_preview, row.review);
  assert.equal(result.public_record?.content_preview_en, row.review_en);
});
