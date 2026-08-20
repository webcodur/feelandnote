import assert from "node:assert/strict";
import test from "node:test";

import {
  getExpandIndexNavigationOrder,
  getExpandIndexNeighbor,
  groupExpandIndexItems,
} from "./groupExpandIndexItems";

const ORDER = ["BOOK", "VIDEO", "GAME", "MUSIC"] as const;

function source(rows: { id: string; title: string; type: string }[]) {
  return {
    itemIds: rows.map((row) => row.id),
    titles: rows.map((row) => row.title),
    contentTypes: rows.map((row) => row.type),
  };
}

test("항목이 없으면 카테고리도 없다", () => {
  assert.deepEqual(groupExpandIndexItems(source([]), ORDER), []);
});

test("한 카테고리만 있으면 그 헤더 하나와 1부터 순번을 준다", () => {
  const groups = groupExpandIndexItems(
    source([
      { id: "a", title: "천국의 유령", type: "VIDEO" },
      { id: "b", title: "자브리스키 포인트", type: "VIDEO" },
    ]),
    ORDER,
  );

  assert.equal(groups.length, 1);
  assert.equal(groups[0]?.dbType, "VIDEO");
  assert.deepEqual(
    groups[0]?.items.map((item) => [item.localIndex, item.title, item.originalIndex]),
    [
      [1, "천국의 유령", 0],
      [2, "자브리스키 포인트", 1],
    ],
  );
});

test("빈 카테고리 헤더는 만들지 않고 순번은 카테고리마다 리셋한다", () => {
  const groups = groupExpandIndexItems(
    source([
      { id: "m1", title: "Oxygene", type: "MUSIC" },
      { id: "v1", title: "천국의 유령", type: "VIDEO" },
      { id: "m2", title: "Good Times", type: "MUSIC" },
      { id: "b1", title: "존재의 세 가지 거짓말", type: "BOOK" },
    ]),
    ORDER,
  );

  assert.deepEqual(
    groups.map((group) => group.dbType),
    ["BOOK", "VIDEO", "MUSIC"],
  );
  assert.deepEqual(
    groups.map((group) => group.items.map((item) => [item.localIndex, item.title, item.originalIndex])),
    [
      [[1, "존재의 세 가지 거짓말", 3]],
      [[1, "천국의 유령", 1]],
      [
        [1, "Oxygene", 0],
        [2, "Good Times", 2],
      ],
    ],
  );
});

test("카테고리마다 항목이 하나씩이어도 헤더는 네 개까지 뜬다", () => {
  const groups = groupExpandIndexItems(
    source([
      { id: "g", title: "ICO", type: "GAME" },
      { id: "b", title: "책", type: "BOOK" },
      { id: "m", title: "곡", type: "MUSIC" },
      { id: "v", title: "영화", type: "VIDEO" },
    ]),
    ORDER,
  );

  assert.deepEqual(
    groups.map((group) => [group.dbType, group.items[0]?.localIndex, group.items[0]?.originalIndex]),
    [
      ["BOOK", 1, 1],
      ["VIDEO", 1, 3],
      ["GAME", 1, 0],
      ["MUSIC", 1, 2],
    ],
  );
});

test("탐색 순서는 화면에 그린 카테고리와 항목 순서를 그대로 따른다", () => {
  const groups = groupExpandIndexItems(
    source([
      { id: "g", title: "ICO", type: "GAME" },
      { id: "v", title: "영화", type: "VIDEO" },
      { id: "m", title: "곡", type: "MUSIC" },
      { id: "b", title: "책", type: "BOOK" },
    ]),
    ORDER,
  );
  const navigationOrder = getExpandIndexNavigationOrder(groups);

  assert.deepEqual(navigationOrder, [3, 1, 0, 2]);
  assert.equal(getExpandIndexNeighbor(navigationOrder, 0, -1), 1);
  assert.equal(getExpandIndexNeighbor(navigationOrder, 0, 1), 2);
});

test("첫 항목과 마지막 항목의 이전·다음 탐색은 화면 순서의 양끝을 순환한다", () => {
  const navigationOrder = [3, 1, 0, 2];

  assert.equal(getExpandIndexNeighbor(navigationOrder, 3, -1), 2);
  assert.equal(getExpandIndexNeighbor(navigationOrder, 2, 1), 3);
  assert.equal(getExpandIndexNeighbor([], 7, 1), 7);
});
