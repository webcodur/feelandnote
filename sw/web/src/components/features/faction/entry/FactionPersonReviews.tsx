"use client";

import { useEffect, useId, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { MessageSquareText } from "lucide-react";
import { getPublicUserContents, type GetUserContentsResponse } from "@/actions/contents/getUserContents";
import ContentLibrary from "@/components/features/user/contentLibrary/ContentLibrary";
import { PendingBlock, RetryBlock } from "@/components/ui/pending";
import { FACTION_PERSON_LAYOUT as layout } from "./factionPersonLayout";

interface FactionPersonReviewsProps {
  celebId: string;
  name: string;
  avatarUrl?: string | null;
}

/** 인물 상세와 같은 공개 감상 목록·리뷰를 모달 안에서 펼친다. */
export default function FactionPersonReviews({ celebId, name, avatarUrl }: FactionPersonReviewsProps) {
  const t = useTranslations("celebPage");
  const locale = useLocale();
  const titleId = useId();
  const [data, setData] = useState<GetUserContentsResponse | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    // 첫 감상 종류로 시작한다. 도서가 없고 영상·음악만 있는 인물도 기록을 열 수 있다.
    getPublicUserContents({ userId: celebId, limit: 1 }, locale)
      .then((result) => { if (alive) setData(result); })
      .catch((error) => {
        console.error("[FactionPersonReviews] 감상 기록 조회 실패:", error);
        if (alive) setFailed(true);
      });
    return () => { alive = false; };
  }, [celebId, locale, attempt]);

  return (
    <section className={layout.shelf} aria-labelledby={titleId} data-person-reviews>
      <h3 id={titleId} className="mb-5 flex items-center gap-2 text-lg font-bold text-text-primary">
        <MessageSquareText size={18} aria-hidden />
        {t("recordCountsLabel")}
      </h3>
      {failed && <RetryBlock onRetry={() => { setFailed(false); setAttempt(value => value + 1); }} />}
      {!failed && !data && <PendingBlock variant="panel" label={t("loading.library")} message={t("loading.library")} />}
      {data && (
        <div className="md:[--reading-preview-max-height:min(28rem,55svh)] md:[--reading-preview-max-width:72ch]">
          <ContentLibrary
            key={celebId}
            mode="viewer"
            ownerKind="celeb"
            targetUserId={celebId}
            ownerNickname={name}
            ownerAvatarUrl={avatarUrl}
            emptyMessage={t("libraryEmpty")}
            defaultViewMode="expand"
            hideControlWrapper
            hideReviewFilter
            initialContents={data}
          />
        </div>
      )}
    </section>
  );
}
