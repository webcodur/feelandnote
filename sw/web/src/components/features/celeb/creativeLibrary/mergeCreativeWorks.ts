import type { FigureBookContent } from "@/actions/figure-books/getFigureBooks";
import type { LiveWorkItem } from "./types";

export type CreativeLibraryItem =
  | { source: "authored"; id: string; work_type: "BOOK"; book: FigureBookContent }
  | { source: "wikidata"; id: string; work_type: string | null; work: LiveWorkItem };

function titleKey(title: string | null | undefined): string {
  // 분권·전집·부제·괄호는 다른 작품일 수 있어 지우지 않는다.
  const normalized = (title ?? "").normalize("NFC").trim().replace(/\s+/gu, " ").toLowerCase();
  // 한국어 표제는 판본마다 띄어쓰기가 달라도 같은 글자 순서면 대조한다.
  return /[가-힣]/u.test(normalized) ? normalized.replace(/\s/gu, "") : normalized;
}

function isbnKey(isbn: string | null | undefined): string {
  const key = (isbn ?? "").replace(/[\s-]/gu, "").toUpperCase();
  return /^(?:\d{9}[\dX]|\d{13})$/u.test(key) ? key : "";
}

/** 확인한 저작을 앞에 두고 동일 도서만 Wikidata 결과에서 뺀다. */
export function mergeCreativeWorks(
  authoredBooks: readonly FigureBookContent[],
  liveWorks: readonly LiveWorkItem[],
): CreativeLibraryItem[] {
  const books = authoredBooks.filter((book) => book.type === "BOOK");
  const qids = new Set<string>();
  const titles = new Set<string>();
  const isbns = new Set<string>();

  for (const book of books) {
    if (book.wikidataQid) qids.add(book.wikidataQid);
    for (const title of [book.title, book.titleKo, book.titleEn, book.workTitle]) {
      const key = titleKey(title);
      if (key) titles.add(key);
    }
    for (const edition of book.editions) {
      const key = isbnKey(edition.isbn);
      if (key) isbns.add(key);
    }
  }

  const result: CreativeLibraryItem[] = books.map((book) => ({
    source: "authored",
    id: book.id,
    work_type: "BOOK",
    book,
  }));
  for (const work of liveWorks) {
    // 책과 동명 영화·음악을 합치지 않는다.
    if (work.work_type === "BOOK" && (
      qids.has(work.id)
      || isbns.has(isbnKey(work.isbn))
      || titles.has(titleKey(work.title_ko))
      || titles.has(titleKey(work.title_en))
    )) continue;
    result.push({ source: "wikidata", id: work.id, work_type: work.work_type, work });
  }
  return result;
}
