import assert from "node:assert/strict";
import test from "node:test";
import { parseRecentAtlas, rememberAtlas, recentAtlasHref } from "./recent-atlas";

test("옛 영화 세력의 위치를 시네마 그룹으로 복원하고 중복 기록을 합친다", () => {
  assert.deepEqual(parseRecentAtlas(JSON.stringify([
    { entryId: 'd843e24d-77a9-4b1c-8f25-6bc84ef28fc2', groupId: '좌안의 실험과 개인적 영화', personId: 'varda' },
    { entryId: 'a186f467-50e4-416d-96b7-9f61b003bb91', groupId: null, personId: null },
  ])), [{ entryId: 'a186f467-50e4-416d-96b7-9f61b003bb91', groupId: '누벨바그', personId: 'varda' }]);
});

test("냉전의 최전선은 냉전 그룹으로 합치고 폐기한 대기 명단은 지운다", () => {
  const result = parseRecentAtlas(JSON.stringify([
    { entryId: '59f23ca9-00a3-473a-ab5f-41dfba6c381d', groupId: null, personId: 'arkhipov' },
    { entryId: 'b3ef4a3e-c17f-4e79-bc2e-e2c98a3a91c4', groupId: null, personId: null },
    { entryId: 'economists', groupId: null, personId: null },
  ]));
  assert.deepEqual(result, [{ entryId: '374b2b54-31f6-4bb3-ab16-6fe4af05ea90', groupId: '냉전의 현장', personId: 'arkhipov' }]);
  assert.deepEqual(parseRecentAtlas(JSON.stringify(result)), result);
});

test("손상된 저장값을 건너뛰고 중복 방문을 제거한다", () => {
  assert.deepEqual(parseRecentAtlas("{"), []);
  assert.deepEqual(parseRecentAtlas('{"entryId":"a"}'), []);
  const item = { entryId: "a", groupId: null, personId: null };
  assert.deepEqual(parseRecentAtlas(JSON.stringify([null, {}, item, item, { ...item, entryId: "b", personId: 1 }])), [item]);
});

test("재방문을 맨 앞으로 옮기고 소개를 닫아도 읽던 인물을 유지한다", () => {
  const a = { entryId: "a", groupId: "왕가", personId: "person-a" };
  const b = { entryId: "b", groupId: null, personId: null };
  assert.deepEqual(rememberAtlas([b, a], { ...a, personId: null }), [a, b]);
  assert.equal(rememberAtlas([a], { ...a, groupId: "신들", personId: null })[0].personId, null);
  const visits = Array.from({ length: 10 }, (_, i) => ({ ...b, entryId: String(i) }));
  assert.equal(rememberAtlas(visits, a).length, 8);
});

test("그룹·인물 복원 주소를 안전하게 인코딩한다", () => {
  const href = recentAtlasHref("/explore/myth/iliad", "왕가 & 신들", "person-a");
  const query = new URL(href, "https://feelandnote.com").searchParams;
  assert.equal(query.get("group"), "왕가 & 신들");
  assert.equal(query.get("person"), "person-a");
  assert.equal(recentAtlasHref("/explore/faction/openai", null, null), "/explore/faction/openai");
});

test("허브 자동 진입은 읽던 위치를 보존하고 직접 전체 그룹 선택은 초기화한다", () => {
  const saved = { entryId: "a", groupId: "왕가", personId: "person-a" };
  const landing = { entryId: "a", groupId: null, personId: null };
  assert.deepEqual(rememberAtlas([saved], landing, true), [saved]);
  assert.deepEqual(rememberAtlas([saved], landing), [landing]);
});
