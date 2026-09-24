import { NextRequest } from "next/server";
import { getCelebBookShelf } from "@/actions/celebs/getCelebBookShelf";
import { getCelebVirtualMonologue } from "@/actions/celebs/getCelebVirtualMonologue";

const UUID = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;

/** 독백 읽기 창의 부가 자료. GET으로 읽어 낭독 본문 Server Action 대기열을 막지 않는다. */
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id") ?? "";
  const locale = request.nextUrl.searchParams.get("locale") ?? "";
  if (!UUID.test(id) || (locale !== "ko" && locale !== "en")) {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    // 공개된 독백 인물의 책장만 내보낸다.
    if (!await getCelebVirtualMonologue(id, locale)) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }
    const shelf = await getCelebBookShelf(id, locale);
    return Response.json(shelf, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[monologue-bookshelf] 책장 조회 실패:", error);
    return Response.json({ error: "Bookshelf unavailable" }, { status: 500 });
  }
}
