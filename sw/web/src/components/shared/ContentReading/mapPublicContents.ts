import type { UserContentWithContent } from "@/actions/contents/getMyContents";
import type { UserContentPublic } from "@/actions/contents/getUserContents";

/** viewer 모드 응답(UserContentPublic)을 서재 공용 형태(UserContentWithContent)로 매핑 */
export function mapPublicToUserContent(
  items: UserContentPublic[],
  targetUserId: string
): UserContentWithContent[] {
  return items.map((item) => ({
    id: item.id,
    content_id: item.content_id,
    user_id: targetUserId,
    status: item.status,
    visibility: item.visibility ?? 'public',
    created_at: item.created_at,
    updated_at: item.created_at, // viewer 모드에서는 created_at으로 대체
    completed_at: null,
    rating: item.public_record?.rating ?? null,
    review: item.public_record?.content_preview ?? null,
    review_en: item.public_record?.content_preview_en ?? null,
    is_recommended: false,
    is_spoiler: item.public_record?.is_spoiler ?? false,
    is_pinned: false,
    pinned_at: null,
    source_url: item.source_url,
    content: {
      id: item.content.id,
      type: item.content.type,
      title: item.content.title,
      creator: item.content.creator,
      thumbnail_url: item.content.thumbnail_url,
      description: null,
      publisher: null,
      release_date: null,
      metadata: item.content.metadata,
      user_count: item.content.user_count ?? null,
      title_ko: item.content.title_ko ?? null,
      title_en: item.content.title_en ?? null,
      creator_en: item.content.creator_en ?? null,
      isbn_ko: item.content.isbn_ko ?? null,
      isbn_en: item.content.isbn_en ?? null,
      thumbnail_en: item.content.thumbnail_en ?? null,
      has_en_edition: item.content.has_en_edition ?? null,
      title_badge: item.content.title_badge ?? null,
      affiliate_url: item.content.affiliate_url ?? null,
    },
  }));
}
