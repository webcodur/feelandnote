/* ─────────────────────────────────────────────
 * [celeb 상세] hero — 정적 신원(headline/meta)
 * - 목차 위치: 머리말(본문 앞, 목차 밖)
 * - 데이터: profile/locale
 * - 함께 보기: HeroSectionContent.tsx, HeroPhoto.tsx
 * ───────────────────────────────────────────── */
"use client";

import CelebAvatarImage from "@/components/ui/CelebAvatarImage";
import { useTranslations } from "next-intl";

import ProfessionInfoButton from "@/components/features/celeb/ProfessionInfoButton";
import NationalityText from "@/components/ui/NationalityText";
import { getCelebAge } from "@/lib/celeb/lifespan";
import { formatCelebRecordCounts } from "@/lib/celeb/meta";
import type { CelebBySlugProfile } from "@/actions/user/getCelebBySlug";
import type { Locale } from "@/types/locale";

import { CelebTierBadge } from "../../CelebTierBadge";
import styles from "../../CelebPageContent.module.css";
import { formatCelebPeriod } from "@/lib/utils/celeb-period";

interface HeroIdentityProps {
  profile: CelebBySlugProfile;
  locale: Locale;
}

export default function HeroIdentity({ profile, locale }: HeroIdentityProps) {
  const t = useTranslations("celebPage");
  const tp = useTranslations("profession");

  /* ── 1. 신원 파생값 ── */
  const nickname = profile.nickname;
  const celebReality = profile.celeb_reality ?? "REAL";
  const professionLabel = profile.profession
    ? tp.has(profile.profession)
      ? tp(profile.profession)
      : tp("uncategorized")
    : null;
  const period = formatCelebPeriod(profile.birth_date, profile.death_date);
  const ageInfo = getCelebAge(profile.birth_date, profile.death_date);
  const ageLabel = ageInfo
    ? t(
        ageInfo.deceased
          ? ageInfo.approximate
            ? "ageAtDeathApprox"
            : "ageAtDeath"
          : ageInfo.approximate
            ? "ageCurrentApprox"
            : "ageCurrent",
        { age: ageInfo.age },
      )
    : null;
  // 서가가 있는 full 인물만. light는 기록을 볼 자리가 없어 건수만 띄우면 헛걸음이 된다.
  const recordCounts = (profile.celeb_tier ?? "full") === "full"
    ? formatCelebRecordCounts(profile.contentTypeCounts, locale)
    : [];
  const mobileAgeLabel =
    ageInfo && !ageInfo.deceased && locale === "ko"
      ? `${ageInfo.approximate ? "약 " : ""}${ageInfo.age}세`
      : ageLabel;

  return (
    <div className={styles.identityTop}>
      <div className={styles.identityPrimary}>
        {/* ── 2. 이름·헤드라인 ── */}
        <div
          className={`${styles.identityHeading} ${
            profile.photo_url && profile.avatar_url
              ? styles.identityHeadingWithAvatar
              : ""
          }`}
        >
          {profile.photo_url && profile.avatar_url ? (
            <div className={styles.identityAvatar}>
              <CelebAvatarImage
                src={profile.avatar_url}
                alt=""
                className={styles.identityAvatarImage}
              />
            </div>
          ) : null}

          <div className={styles.identityHeadingCopy}>
            {profile.title ? (
              <p className={styles.title}>{profile.title}</p>
            ) : null}
            <h1 className={styles.name}>{nickname}</h1>
          </div>
        </div>

        {profile.headline ? (
          <p className={styles.headline}>{profile.headline}</p>
        ) : null}

        {/* 검색 제목의 건수를 화면 머리에서도 같은 말로 보여 준다 — 제목과 화면이 어긋나면
            Google이 제목을 headline 같은 다른 문구로 바꿔 쓴다(lib/celeb/meta.ts) */}
        {recordCounts.length > 0 ? (
          <p className={styles.recordCounts}>
            <span className={styles.recordCountsLabel}>{t("recordCountsLabel")}</span>
            <span>{recordCounts.join(" · ")}</span>
          </p>
        ) : null}

        {/* ── 3. 메타(직업·국적·생몰·나이·티어·번역고지) ── */}
        <div className={styles.meta}>
          {professionLabel ? (
            <span className={styles.profession}>
              <ProfessionInfoButton
                profession={profile.profession!}
                label={professionLabel}
              />
            </span>
          ) : null}
          {profile.nationality ? (
            <span className="grayscale">
              <NationalityText code={profile.nationality} />
            </span>
          ) : null}
          {period ? <span className="font-mono">{period}</span> : null}
          {ageLabel ? (
            <span
              className="rounded-md border border-accent-dim/25 bg-accent/[0.04] px-3 py-1.5 font-medium leading-tight text-text-secondary"
              aria-label={ageLabel}
            >
              <span className={styles.desktopAgeLabel}>{ageLabel}</span>
              <span className={styles.mobileAgeLabel} aria-hidden="true">
                {mobileAgeLabel}
              </span>
            </span>
          ) : null}
          <CelebTierBadge reality={celebReality} />
        </div>

        {locale === "en" && profile.translationFallbacks.length > 0 ? (
          <p className="mt-3 leading-relaxed text-amber-200/70">
            {t("originalKoreanNotice")}
          </p>
        ) : null}
      </div>
    </div>
  );
}
