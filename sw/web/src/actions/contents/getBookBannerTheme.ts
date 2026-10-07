"use server";

import { CACHE_TAGS } from "@feelandnote/shared/constants/cache-tags";
import { selectAllPages } from "@feelandnote/shared/lib/paginate";
import { cachedDetail, throwOnQueryError } from "@/lib/cache";
import { createStaticClient } from "@/lib/db/static";
import { resolveBookBannerTheme, type BookBannerTheme } from "@/lib/books/bookBanner";

interface Reader {
  nationality: string | null;
  birth_date: string | null;
  death_date: string | null;
  celeb_reality: string;
}
interface ReaderRow { reader: Reader | Reader[] | null }

/** Banner context uses all public readers, independently of the ten-item review feed. */
export async function getBookBannerTheme(contentId: string): Promise<BookBannerTheme> {
  try {
    return await cachedDetail(CACHE_TAGS.CONTENTS, contentId, ["book-banner-v1", contentId], async () => {
      const db = createStaticClient();
      const [rows, work] = await Promise.all([selectAllPages<ReaderRow>((from, to) => db.from("celeb_contents")
        .select("id,reader:celebs!celeb_contents_celeb_id_fkey!inner(nationality,birth_date,death_date,celeb_reality)")
        .eq("content_id", contentId).eq("visibility", "public").eq("reader.publication_status", "active")
        .order("id").range(from, to).overrideTypes<ReaderRow[], { merge: false }>()),
        db.from("contents").select("release_date").eq("id", contentId).maybeSingle(),
      ]);
      throwOnQueryError("작품 배너 발행일 조회", work.error);
      const readers = rows.flatMap(row => row.reader ? Array.isArray(row.reader) ? row.reader : [row.reader] : []);
      return resolveBookBannerTheme(readers.map(reader => ({ nationality: reader.nationality,
        birthDate: reader.birth_date, deathDate: reader.death_date, reality: reader.celeb_reality })), work.data?.release_date);
    }, { extraTags: [CACHE_TAGS.CELEBS] });
  } catch (error) {
    console.error("[book-banner] reader context unavailable", error);
    return "library";
  }
}
