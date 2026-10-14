import assert from "node:assert/strict";
import test from "node:test";
import { forgetRecentHistory, isCurrentRecentHistory, legacyRecentHistory, parseRecentHistory, recentHistoryForKind, rememberRecentHistory, RECENT_HISTORY_LIMIT, type RecentHistoryVisit } from "./recent-history";

const myth: RecentHistoryVisit = { kind: "myth", id: "odyssey", href: "/explore/myth/homer-odyssey", title: "오디세이아", thumbnail: null };
const book: RecentHistoryVisit = { kind: "content", id: "odyssey", href: "/content/odyssey?category=book&editionId=72", title: "Odyssey", thumbnail: null };

test("옛 쿼리 주소의 최근 기록도 현재 세력 ID와 그룹으로 복원한다", () => {
  for (const query of ['tag=french-new-wave', 'faction=d843e24d-77a9-4b1c-8f25-6bc84ef28fc2']) {
    const result = parseRecentHistory(JSON.stringify([
      { kind: 'faction', id: 'legacy-query', href: `/explore/faction?${query}&person=varda`, title: '누벨바그', thumbnail: null, visitedAt: 3 },
      { kind: 'faction', id: 'a186f467-50e4-416d-96b7-9f61b003bb91', href: '/explore/faction/cinema', title: '시네마', thumbnail: null, visitedAt: 1 },
    ]));
    assert.equal(result.length, 1);
    assert.equal(result[0].id, 'a186f467-50e4-416d-96b7-9f61b003bb91');
    assert.deepEqual(result[0].position, { groupId: '누벨바그', personId: 'varda' });
    assert.equal(new URL(result[0].href, 'https://feelandnote.com').pathname, '/explore/faction/cinema');
  }
});

test("폐기한 명단의 최근 기록을 제거하고 냉전 기록의 위치를 합친다", () => {
  const base = { kind: 'faction', thumbnail: null, visitedAt: 1 };
  const result = parseRecentHistory(JSON.stringify([
    { ...base, id: 'old', title: '경제학자들', href: '/explore/faction?tag=c8f438a3-5a9f-4053-8b10-077746a38987' },
    { ...base, id: 'b3ef4a3e-c17f-4e79-bc2e-e2c98a3a91c4', title: '옛 명단', href: '/explore/faction/software-legends' },
    { ...base, id: '59f23ca9-00a3-473a-ab5f-41dfba6c381d', title: '냉전의 최전선', href: '/explore/faction/cold-war-frontlines?person=arkhipov' },
    { ...base, kind: 'profile', id: 'person', title: '인물', href: '/celeb/person' },
  ]));
  assert.equal(result.length, 2);
  assert.equal(result[0].id, '374b2b54-31f6-4bb3-ab16-6fe4af05ea90');
  assert.equal(result[0].subtitle, '냉전의 현장');
  assert.equal(new URL(result[0].href, 'https://feelandnote.com').searchParams.get('person'), 'arkhipov');
  assert.equal(result[1].kind, 'profile');
  assert.deepEqual(parseRecentHistory(JSON.stringify(result)), result);
});

test("폐기한 영화 세력의 최근 기록은 그룹·인물 위치를 살려 시네마 한 항목으로 합친다", () => {
  const old = [
    { kind: 'faction', id: '799450d5-6671-43af-9c22-2f886e1de8fd', href: '/explore/faction/dogme-95?person=person-a', title: '도그마 95', thumbnail: 'cover.webp', visitedAt: 3 },
    { kind: 'faction', id: '15b98aa8-6372-48bd-a6ce-a365c2147a07', href: '/explore/faction/hollywood-blacklist', title: '블랙리스트', thumbnail: null, visitedAt: 2 },
    { kind: 'faction', id: 'a186f467-50e4-416d-96b7-9f61b003bb91', href: '/explore/faction/cinema', title: '시네마', thumbnail: null, visitedAt: 1 },
  ];
  const parsed = parseRecentHistory(JSON.stringify(old));
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].id, 'a186f467-50e4-416d-96b7-9f61b003bb91');
  assert.equal(parsed[0].title, '시네마');
  assert.equal(parsed[0].titles?.en, 'Cinema');
  assert.equal(parsed[0].subtitle, '도그마 95');
  assert.deepEqual(parsed[0].position, { groupId: '도그마 95', personId: 'person-a' });
  const destination = new URL(parsed[0].href, 'https://feelandnote.com');
  assert.equal(destination.pathname, '/explore/faction/cinema');
  assert.equal(destination.searchParams.get('group'), '도그마 95');
  assert.equal(destination.searchParams.get('person'), 'person-a');
  assert.equal(parsed[0].visitedAt, 3);
  assert.deepEqual(parseRecentHistory(JSON.stringify(parsed)), parsed);
});

test("삭제는 같은 ID의 다른 종류를 보존하고 나머지 기록·순서를 바꾸지 않는다", () => {
  const items = rememberRecentHistory(rememberRecentHistory([], myth, 1), book, 2);
  const removed = forgetRecentHistory(items, myth);
  assert.deepEqual(removed, [items[0]]);
  assert.deepEqual(parseRecentHistory(JSON.stringify(removed)), removed);
  assert.deepEqual(forgetRecentHistory(removed, myth), removed);
});

test("마지막 기록을 지우면 빈 목록을 저장하며 실제 재방문은 다시 추가한다", () => {
  const removed = forgetRecentHistory(rememberRecentHistory([], myth, 1), myth);
  assert.deepEqual(parseRecentHistory(JSON.stringify(removed)), []);
  assert.deepEqual(rememberRecentHistory(removed, myth, 2), [{ ...myth, titles: {}, subtitles: {}, visitedAt: 2 }]);
});

test("현재 항목 표시는 언어·판본·그룹 조건과 주소 끝 슬래시를 구분하지 않는다", () => {
  const item = { ...book, visitedAt: 1 };
  assert.equal(isCurrentRecentHistory(item, "/en/content/odyssey/?editionId=99#work-information"), true);
  assert.equal(isCurrentRecentHistory(item, "/ko/content/odyssey"), true);
  assert.equal(isCurrentRecentHistory(item, "/content/odyssey-other"), false);
  assert.equal(isCurrentRecentHistory({ ...myth, href: myth.href + "?group=crew&person=odysseus", visitedAt: 1 }, myth.href), true);
});

test("현재 인물·작품의 ID가 있으면 이전 주소 형태에도 같은 항목을 표시한다", () => {
  const item = { ...book, visitedAt: 1 };
  assert.equal(isCurrentRecentHistory(item, "/content/canonical", "odyssey"), true);
  assert.equal(isCurrentRecentHistory(item, "/content/odyssey", "other"), false);
});

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
