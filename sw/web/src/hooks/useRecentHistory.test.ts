import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import ts from "typescript";
import * as history from "../lib/recent-history";
import * as atlas from "../lib/recent-atlas";

function loadStore(storage = new Map<string, string>()) {
  const code = ts.transpileModule(readFileSync(new URL("./useRecentHistory.ts", import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const loaded = { exports: {} as typeof import("./useRecentHistory") };
  const refs: { current: unknown }[] = [];
  let refIndex = 0;
  const react = {
    useRef: (initial: unknown) => refs[refIndex++] ??= { current: initial },
    useEffectEvent: (callback: () => void) => callback,
    useEffect: (callback: () => void) => callback(),
  };
  const modules: Record<string, unknown> = { react, "@/lib/recent-history": history, "@/lib/recent-atlas": atlas };
  new Function("require", "module", "exports", "localStorage", code)((id: string) => {
    if (!(id in modules)) throw new Error(`Unexpected dependency: ${id}`);
    return modules[id];
  }, loaded, loaded.exports, {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
  });
  return { ...loaded.exports, storage, renderVisit: (visit: history.RecentHistoryVisit | null) => {
    refIndex = 0;
    loaded.exports.useRecordRecentHistory(visit);
  } };
}

const myth: history.RecentHistoryVisit = {
  kind: "myth", id: "khmer", href: "/explore/myth/myth-khmer", title: "크메르", thumbnail: null,
};

test("삭제한 옛 도감 기록은 마이그레이션과 새 저장소 복원으로 되살아나지 않는다", () => {
  for (const kind of ["myth", "faction"] as const) {
    const target = { ...myth, kind, href: `/explore/${kind}/khmer` };
    const legacy = [{ entryId: "khmer", groupId: null, personId: null }, { entryId: "keep", groupId: "group", personId: "person" }];
    const store = loadStore(new Map([[atlas.RECENT_ATLAS_STORAGE_KEYS[kind], JSON.stringify(legacy)]]));
    store.recordRecentHistory(target);
    store.recordRecentHistory({ ...target, id: "keep" });
    store.removeRecentHistory(target);
    const old = atlas.parseRecentAtlas(store.storage.get(atlas.RECENT_ATLAS_STORAGE_KEYS[kind]) ?? null);
    assert.deepEqual(old, [legacy[1]]);
    store.seedRecentHistory(old.map(item => ({ ...target, id: item.entryId })));
    const restored = loadStore(store.storage);
    assert.deepEqual(restored.getRecentHistory().map(item => item.id), ["keep"]);
  }
});

test("현재 항목 삭제 뒤 늦은 번역·표지 갱신은 기록을 다시 넣지 않고 실제 재방문은 넣는다", () => {
  const store = loadStore();
  store.renderVisit(myth);
  store.removeRecentHistory(myth);
  store.renderVisit({ ...myth, thumbnail: "/new-cover.webp", titles: { en: "Khmer" } });
  assert.deepEqual(store.getRecentHistory(), []);
  store.renderVisit({ ...myth, id: "other" });
  store.renderVisit(myth);
  assert.deepEqual(store.getRecentHistory().map(item => item.id), ["khmer", "other"]);
});

test("인물·작품의 마지막 기록 삭제는 옛 기록 대신 빈 새 저장소를 복원한다", () => {
  const profiles = JSON.stringify([{ id: "homer", slug: "homer", profileType: "CELEB", nickname: "호메로스", visitedAt: 1 }]);
  const contents = JSON.stringify([{ id: "book", title: "책", visitedAt: 2 }]);
  const store = loadStore(new Map([["recent_profiles_v2", profiles], ["recent_contents", contents]]));
  for (const item of store.getRecentHistory()) store.removeRecentHistory(item);
  assert.equal(store.storage.get(history.RECENT_HISTORY_STORAGE_KEY), "[]");
  assert.deepEqual(loadStore(store.storage).getRecentHistory(), []);
});
