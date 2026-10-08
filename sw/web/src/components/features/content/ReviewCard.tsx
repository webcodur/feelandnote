"use client";

import { useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import { ChevronDown, ChevronUp, EyeOff, Star, ExternalLink, Sparkles } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { BlurDissolve, FormattedText } from "@/components/ui";
import CelebAvatarImage from "@/components/ui/CelebAvatarImage";
import Button from "@/components/ui/Button";
import UserAvatarWithPopover from "@/components/shared/UserAvatarWithPopover";
import { BLUR_DATA_URL } from "@/constants/image";
import { PROFESSION_ICONS, getProfessionColor } from "@/constants/professionIcons";
import { getCelebProfileUrl } from "@/lib/url";
import { Link } from "@/i18n/navigation";
import type { ReviewFeedItem } from "@/actions/contents/getReviewFeed";
import { cn } from "@/lib/utils";
import styles from "./ReviewCard.module.css";

interface ReviewCardProps {
  item: ReviewFeedItem;
  className?: string;
  isExpanded?: boolean;
  hideTime?: boolean;
}

// 일반 리뷰는 전문을 표시하고, 실제 표시 분량이 이 기준을 넘는 장문만 접는다.
const LONG_REVIEW_LINES = 48;

// 인물 사진은 헤더 왼쪽을 빈틈없이 채운다. 작은 카드에서도 얼굴 크기를 지킨다.
export default function ReviewCard({ item, className, isExpanded = false }: ReviewCardProps) {
  const [showSpoiler, setShowSpoiler] = useState(false);
  const [isLongReview, setIsLongReview] = useState(false);
  const [showFullReview, setShowFullReview] = useState(false);
  const readingRef = useRef<HTMLDivElement>(null);
  const nameId = useId();
  const readingId = useId();
  const t = useTranslations("contentDetail.review");
  const tDetail = useTranslations("contentDetail");
  const isEn = useLocale() === "en";
  const isCeleb = item.user.subject_kind === "celeb";
  const nickname = (isEn && item.user.nickname_en) || item.user.nickname || t("anonymous");
  const reviewText = (isEn && item.review_en) || item.review;
  const subtitle = ((isEn && item.user.headline_en) || item.user.headline)
    || ((isEn && item.user.title_en) || item.user.title);
  const profession = item.user.profession;
  const ProfessionIcon = isCeleb && profession ? (PROFESSION_ICONS[profession] ?? Sparkles) : null;
  const canToggle = !isExpanded && isLongReview;
  const collapsed = canToggle && !showFullReview;

  useEffect(() => {
    const content = readingRef.current;
    if (!content || isExpanded) return;
    // 접힌 바깥 틀 대신 안쪽 전문을 재서 폭·언어·글꼴 변화에도 길이를 판단한다.
    const observer = new ResizeObserver(() => {
      const lineHeight = parseFloat(getComputedStyle(content).lineHeight);
      setIsLongReview(content.getBoundingClientRect().height > lineHeight * LONG_REVIEW_LINES);
    });
    observer.observe(content);
    return () => observer.disconnect();
  }, [reviewText, showSpoiler, isExpanded]);

  return (
    <article aria-labelledby={nameId} data-review-kind={isCeleb ? "celeb" : "member"}
      className={cn(styles.card, !isCeleb && styles.member, className)}>
      <div className={styles.header}>
        <div className={styles.avatarSlot}>
          <UserAvatarWithPopover userId={item.user.id} subjectKind={item.user.subject_kind}
            trigger={<button type="button" aria-label={nickname} className={styles.portrait}>
              {item.user.avatar_url ? isCeleb ? (
                <BlurDissolve className="absolute inset-0">
                  <CelebAvatarImage src={item.user.avatar_url} alt={nickname}
                    className="object-cover" blurDataURL={BLUR_DATA_URL} />
                </BlurDissolve>
              ) : (
                <Image src={item.user.avatar_url} alt={nickname} fill unoptimized className="object-cover"
                  placeholder="blur" blurDataURL={BLUR_DATA_URL} sizes="44px" />
              ) : <span className={styles.initial}>{nickname[0]}</span>}
            </button>} />
        </div>
        <div className={styles.identity}>
          {isCeleb && subtitle && <p className={styles.subtitle} title={subtitle}>{subtitle}</p>}
          <div className={styles.nameRow}>
            {isCeleb && item.user.slug ? (
              <Link id={nameId} href={getCelebProfileUrl(item.user)} className={styles.nameLink}>{nickname}</Link>
            ) : <span id={nameId} className={styles.name}>{nickname}</span>}
            {ProfessionIcon && <span className={styles.profession} title={profession ?? undefined}>
              <ProfessionIcon size={13} className={getProfessionColor(profession!) ?? "text-accent"} aria-hidden="true" />
            </span>}
          </div>
        </div>
        {(!!item.rating || item.source_url) && <div className={styles.headerActions}>
          {!!item.rating && <span className={styles.rating}>
            <Star size={12} fill="currentColor" aria-hidden="true" /><span>{item.rating}</span>
          </span>}
          {item.source_url && <a href={item.source_url} target="_blank" rel="noopener noreferrer" className={styles.source}
            title={isEn ? "View source" : "원문 출처 보기"}>
            <span>{isEn ? "Source" : "출처"}</span><ExternalLink size={12} aria-hidden="true" />
          </a>}
        </div>}
      </div>
      <div className={styles.body}>
        {item.is_spoiler && !showSpoiler ? (
          <Button unstyled onClick={() => setShowSpoiler(true)} className={styles.spoiler}>
            <EyeOff size={15} aria-hidden="true" /><span>{t("spoilerWarning")}</span>
          </Button>
        ) : (
          <>
            <div id={readingId} data-review-reading data-collapsed={collapsed}
              className={cn(styles.reading, collapsed && styles.collapsed)}>
              <div ref={readingRef}>
                {item.is_spoiler && <Button unstyled onClick={() => setShowSpoiler(false)}
                  className={styles.hideSpoiler} aria-label={t("hideSpoiler")} title={t("hideSpoiler")}>
                  <EyeOff size={14} aria-hidden="true" />
                </Button>}
                <FormattedText text={reviewText} />
              </div>
            </div>
            {canToggle && <Button unstyled type="button" className={styles.readMore}
              aria-expanded={!collapsed} aria-controls={readingId}
              onClick={() => setShowFullReview(value => !value)}>
              <span>{tDetail(collapsed ? "showMore" : "showLess")}</span>
              {collapsed ? <ChevronDown size={15} aria-hidden="true" /> : <ChevronUp size={15} aria-hidden="true" />}
            </Button>}
          </>
        )}
      </div>
    </article>
  );
}
