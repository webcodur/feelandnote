import assert from "node:assert/strict";
import test from "node:test";
import { legacyRecentHistory, parseRecentHistory, recentHistoryForKind, rememberRecentHistory, RECENT_HISTORY_LIMIT, type RecentHistoryVisit } from "./recent-history";

const myth: RecentHistoryVisit = { kind: "myth", id: "odyssey", href: "/explore/myth/homer-odyssey", title: "오디세이아", thumbnail: null };
const book: RecentHistoryVisit = { kind: "content", id: "odyssey", href: "/content/odyssey?category=book&editionId=72", title: "Odyssey", thumbnail: null };

test("종류가 다른 같은 ID를 구분하고 재방문을 해당 기록의 맨 앞으로 옮긴다", () => {
  const first = rememberRecentHistory([], myth, 1);
  const second = rememberRecentHistory(first, book, 2);
  const third = rememberRecentHistory(second, { kind: "profile", id: "homer", href: "/celeb/homer", title: "호메로스", thumbnail: null }, 3);
  assert.deepEqual(third.map(item => item.kind), ["profile", "content", "myth"]);
  const revisit = rememberRecentHistory(third, myth, 4);
  assert.deepEqual(revisit.map(item => item.kind), ["myth", "profile", "content"]);
  assert.equal(revisit.length, 3);
  assert.deepEqual(recentHistoryForKind(revisit, "myth").map(item => item.kind), ["myth"]);
  assert.deepEqual(recentHistoryForKind(revisit, "content").map(item => item.kind), ["content"]);
  assert.deepEqual(recentHistoryForKind(revisit, "profile").map(item => item.kind), ["profile"]);
  assert.deepEqual(recentHistoryForKind(revisit, "faction"), []);
});

test("작품 기록이 가득 차도 신화·세력·인물의 최근 기록은 밀려나지 않는다", () => {
  const faction = { ...myth, kind: "faction" as const, id: "ai", href: "/explore/faction/ai-pioneers" };
  const person = { ...myth, kind: "profile" as const, id: "homer", href: "/celeb/homer" };
  let items = rememberRecentHistory(rememberRecentHistory(rememberRecentHistory([], myth, 1), faction, 2), person, 3);
  for (let i = 0; i < 30; i++) items = rememberRecentHistory(items, { ...book, id: String(i) }, i + 4);
  const restored = parseRecentHistory(JSON.stringify(items));
  assert.equal(recentHistoryForKind(restored, "content").length, RECENT_HISTORY_LIMIT);
  assert.equal(recentHistoryForKind(restored, "myth")[0].id, myth.id);
  assert.equal(recentHistoryForKind(restored, "faction")[0].id, faction.id);
  assert.equal(recentHistoryForKind(restored, "profile")[0].id, person.id);
});

test("작품 재방문은 최신 판본 주소와 한영 이름을 함께 보존한다", () => {
  const first = rememberRecentHistory([], { ...book, titles: { ko: "오디세이아" } }, 1);
  const second = rememberRecentHistory(first, { ...book, href: "/content/odyssey?category=book&editionId=73", titles: { en: "The Odyssey" } }, 2);
  assert.equal(second[0].href, "/content/odyssey?category=book&editionId=73");
  assert.deepEqual(second[0].titles, { ko: "오디세이아", en: "The Odyssey" });
  assert.equal(second.length, 1);
});

test("깨진 항목과 외부 주소를 건너뛰고 저장 한도를 지킨다", () => {
  const valid = { ...myth, visitedAt: 1 };
  assert.deepEqual(parseRecentHistory("{"), []);
  const parsed = parseRecentHistory(JSON.stringify([null, {}, { ...valid, href: "https://example.com" },
    { ...valid, href: "//example.com" }, { ...valid, href: "/content/\\example.com" }, valid, valid]));
  assert.deepEqual(parsed, [valid]);
  let items = parsed;
  for (let i = 0; i < 30; i++) items = rememberRecentHistory(items, { ...myth, id: String(i) }, i + 2);
  assert.equal(items.length, RECENT_HISTORY_LIMIT);
  assert.equal(items[0].id, "29");
});

test("세력 주소와 기존 회원 프로필 주소도 같은 목록에 저장된다", () => {
  const faction = { ...myth, kind: "faction" as const, href: "/explore/faction/ai-pioneers?group=founders&person=turing", visitedAt: 2 };
  const profile = { ...myth, kind: "profile" as const, id: "11111111-1111-4111-8111-111111111111", href: "/11111111-1111-4111-8111-111111111111", visitedAt: 1 };
  assert.deepEqual(parseRecentHistory(JSON.stringify([faction, profile])), [faction, profile]);
});

test("기존 인물·작품 기록을 방문 시각 순으로 가져오며 한쪽 손상은 격리한다", () => {
  const profiles = JSON.stringify([{ id: "a", slug: "homer", profileType: "CELEB", nickname: "호메로스", nickname_en: "Homer", visitedAt: 10 }]);
  const contents = JSON.stringify([{ id: "b", title: "오디세이아", visitedAt: 20 }]);
  const migrated = legacyRecentHistory(profiles, contents);
  assert.deepEqual(migrated.map(item => item.kind), ["content", "profile"]);
  assert.equal(migrated[1].href, "/celeb/homer");
  assert.equal(migrated[1].titles?.en, "Homer");
  assert.equal(legacyRecentHistory("{", contents)[0].kind, "content");
});
