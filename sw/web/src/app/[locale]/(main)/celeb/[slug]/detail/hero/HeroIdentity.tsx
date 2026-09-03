/* ─────────────────────────────────────────────
 * [celeb 상세] hero — 정적 신원(headline/meta)
 * - 목차 위치: 머리말(본문 앞, 목차 밖)
 * - 데이터: profile/locale
 * - 함께 보기: HeroSectionContent.tsx, HeroPhoto.tsx
 * ───────────────────────────────────────────── */
"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";

import ProfessionInfoButton from "@/components/features/celeb/ProfessionInfoButton";
import NationalityText from "@/components/ui/NationalityText";
import { getCelebAge } from "@/lib/celeb/lifespan";
import type { CelebBySlugProfile } from "@/actions/user/getCelebBySlug";
import type { Locale } from "@/types/locale";

import { CelebTierBadge } from "../../CelebTierBadge";
import styles from "../../CelebPageContent.module.css";
import { formatCelebPeriod } from "../celebDetailData";

interface HeroIdentityProps {
  profile: CelebBySlugProfile;
  locale: Locale;
}

export default function HeroIdentity({ profile, locale }: HeroIdentityProps) {
  const t = useTranslations("celebPage");
  const tp = useTranslations("profession");

  /* ── 1. 신원 파생값 ── */
  const nickname = profile.nickname;
  const celebTier = profile.celeb_tier ?? "full";
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
              <Image
                src={profile.avatar_url}
                alt=""
                fill
                unoptimized
                sizes="(max-width: 767px) 52px, 64px"
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
          <CelebTierBadge tier={celebTier} />
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
