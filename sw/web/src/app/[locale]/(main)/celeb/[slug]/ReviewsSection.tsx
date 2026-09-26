/* ─────────────────────────────────────────────
 * [celeb 상세] 리뷰(library) — 감상 기록 뷰(리뷰만, 창작 없음)
 * - 목차 위치: library
 * - 데이터: userId/initialContents/initialContentBrief props
 * - 함께 보기: detail/CelebRecordSections.tsx
 * ───────────────────────────────────────────── */
"use client";

import { useCallback, useState } from "react";
import { ScrollText } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

import ContentLibrary from "@/components/features/user/contentLibrary/ContentLibrary";
import { ARCHIVE_ICON_CONTROL_CLASS } from "@/components/features/user/contentLibrary/controlBar/ArchiveViewControls";
import { getCelebProfileUrl } from "@/lib/url";
import type { GetUserContentsResponse } from "@/actions/contents/getUserContents";
import type { ContentBrief } from "@/actions/contents/getContentBrief";

import ViewAllRecordsConfirmModal from "./ViewAllRecordsConfirmModal";

interface ReviewsSectionProps {
  userId: string;
  slug: string;
  nickname: string;
  avatarUrl?: string | null;
  emptyMessage: string;
  initialContents?: GetUserContentsResponse;
  initialContentBrief?: ContentBrief | null;
}

export default function ReviewsSection({
  userId,
  slug,
  nickname,
  avatarUrl,
  emptyMessage,
  initialContents,
  initialContentBrief,
}: ReviewsSectionProps) {
  const t = useTranslations("celebPage");
  const router = useRouter();

  // 펼쳐보기에서 지금 보던 작품을 "전체 보기"에서도 같은 자리에서 이어 보게 한다.
  const [activeContent, setActiveContent] = useState<{ contentId: string; index: number } | null>(null);
  const onActiveContentChange = useCallback((contentId: string | null, index: number) => {
    setActiveContent(contentId ? { contentId, index } : null);
  }, []);
  const [isRecordsConfirmOpen, setIsRecordsConfirmOpen] = useState(false);
  // next-intl router가 화면 언어 접두어를 붙이므로 여기선 접두어 없는 경로만 만든다
  const recordsHref = `${getCelebProfileUrl({ id: userId, slug })}/records`
    + (activeContent ? `?focus=${encodeURIComponent(activeContent.contentId)}` : "");

  return (
    <div>
      <ContentLibrary
        mode="viewer"
        ownerKind="celeb"
        targetUserId={userId}
        emptyMessage={emptyMessage}
        hideReviewFilter
        ownerNickname={nickname}
        ownerAvatarUrl={avatarUrl}
        /* 인물 서가는 펼쳐보기 하나로 연다. 감상 글과 작품 정보를 한 번에 펴고
           이전·다음과 감상 목록으로 옮긴다. 목록형은 "전체 보기" 페이지가 맡는다. */
        defaultViewMode="expand"
        hideControlWrapper
        initialContents={initialContents}
        initialContentBrief={initialContentBrief}
        onActiveContentChange={onActiveContentChange}
        // 글줄 링크였던 "감상 기록 전체 보기"를 필터 칩 줄 옆 아이콘으로 옮긴다.
        // 펼쳐보기에서 보던 작품이 있으면 그 작품이 있는 쪽에서 이어 연다.
        filterTrailing={(initialContents?.total ?? 0) > 0 ? (
          <Link
            href={recordsHref}
            prefetch={false}
            onClick={(event) => {
              if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
              event.preventDefault();
              setIsRecordsConfirmOpen(true);
            }}
            aria-label={t("records.viewAll")}
            title={t("records.viewAll")}
            aria-haspopup="dialog"
            aria-expanded={isRecordsConfirmOpen}
            className={`${ARCHIVE_ICON_CONTROL_CLASS} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent`}
          >
            <ScrollText size={16} aria-hidden />
          </Link>
        ) : undefined}
      />
      <ViewAllRecordsConfirmModal
        isOpen={isRecordsConfirmOpen}
        nickname={nickname}
        onClose={() => setIsRecordsConfirmOpen(false)}
        onConfirm={() => {
          setIsRecordsConfirmOpen(false);
          router.push(recordsHref);
        }}
      />
    </div>
  );
}
