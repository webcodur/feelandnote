import assert from "node:assert/strict";
import test from "node:test";
import { loadMonologueDetail } from "./loadMonologueDetail";

test("a slow bookshelf action cannot hold the monologue in its loading state", async () => {
  // Next.js dispatches client Server Actions one at a time. The shelf occupies
  // the queue indefinitely, so a text action dispatched after it cannot begin.
  let queue = Promise.resolve<unknown>(undefined);
  const enqueue = <T>(work: () => Promise<T>): Promise<T> => {
    const result = queue.then(work);
    queue = result.then(() => undefined, () => undefined);
    return result;
  };

  let revealText: (shown: boolean) => void = () => {};
  const revealed = new Promise<boolean>((resolve) => { revealText = resolve; });
  void loadMonologueDetail(
    () => enqueue(async () => "독백 본문"),
    () => enqueue(() => new Promise<{ authored: [] }>(() => {})),
    () => revealText(true),
    () => {},
  );

  const shown = await Promise.race([
    revealed,
    new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 30)),
  ]);
  assert.equal(shown, true, "the reader should receive the text before the shelf finishes");
});

test("a pending bookshelf read does not block the next figure's monologue", async () => {
  let actionQueue = Promise.resolve<unknown>(undefined);
  const textAction = (value: string) => {
    const result = actionQueue.then(() => value);
    actionQueue = result.then(() => undefined);
    return result;
  };
  const shown: string[] = [];
  let revealSecond: () => void = () => {};
  const secondShown = new Promise<void>((resolve) => { revealSecond = resolve; });
  void loadMonologueDetail(
    () => textAction("첫 번째"),
    () => new Promise<null>(() => {}),
    (text) => { shown.push(text); },
    () => {},
  );
  void loadMonologueDetail(
    () => textAction("두 번째"),
    async () => null,
    (text) => { shown.push(text); revealSecond(); },
    () => {},
  );

  const reachedSecond = await Promise.race([
    secondShown.then(() => true),
    new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 30)),
  ]);
  assert.equal(reachedSecond, true);
  assert.deepEqual(shown, ["첫 번째", "두 번째"]);
});
