interface ShelfOutcome<T> {
  shelf: T | null;
  error: unknown | null;
}

/** 독백 본문이 도착하는 즉시 읽기 창을 열고, 책장은 준비되는 대로 채운다. */
export async function loadMonologueDetail<T>(
  readText: () => Promise<string | null>,
  readShelf: () => Promise<T>,
  onText: (text: string) => void,
  onShelf: (outcome: ShelfOutcome<T>) => void,
): Promise<void> {
  const text = await readText();
  if (!text) throw new Error("Monologue text missing");
  onText(text);
  try {
    onShelf({ shelf: await readShelf(), error: null });
  } catch (error) {
    onShelf({ shelf: null, error });
  }
}
