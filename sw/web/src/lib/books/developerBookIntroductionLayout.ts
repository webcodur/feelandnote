import "server-only";
import { unstable_cache } from "next/cache";
import { rawFetch } from "../rawFetch";
import { getCachedYes24BookDetail } from "./yes24DetailCache";
import { cleanIntroductionFormatting, extractYes24LayoutReferences, restoreIntroductionLayout } from "./bookIntroductionLayout";
import { YES24_PURCHASE_CACHE_SECONDS } from "./yes24Purchase";

const readLayoutReferences = unstable_cache(async (isbn: string) => {
  const detail = await getCachedYes24BookDetail(isbn);
  if (!detail) return [];
  const response = await rawFetch(`https://www.yes24.com/product/goods/${detail.itemId}`, {
    signal: AbortSignal.timeout(15_000), redirect: "error",
  });
  if (!response.ok) throw new Error("Introduction layout reference unavailable");
  return extractYes24LayoutReferences(await response.text(), isbn);
}, ["book-introduction-layout-reference-v2"], { revalidate: YES24_PURCHASE_CACHE_SECONDS });

/** 실패하거나 본문 전체가 일치하지 않으면 원문을 보존한다. 운영에서는 호출하지 않는다. */
export async function getDeveloperIntroductionLayout(isbn: string, source: string): Promise<string> {
  source = cleanIntroductionFormatting(source);
  if (!process.env.YES24_API_KEY?.trim()) return source;
  try {
    return restoreIntroductionLayout(source, await readLayoutReferences(isbn)) ?? source;
  } catch {
    return source;
  }
}
