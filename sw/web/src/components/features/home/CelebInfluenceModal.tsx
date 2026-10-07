"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, BookOpen, Hourglass } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import {
  calculateInfluenceRank,
  INFLUENCE_CATEGORY_FIELDS,
  INFLUENCE_MAX_SCORES,
  INFLUENCE_TOTAL_MAX_SCORE,
} from "@feelandnote/influence-constants";
import Modal from "@/components/ui/Modal";
import { Avatar } from "@/components/ui";
import { PendingBlock, RetryBlock } from "@/components/ui/pending";
import { getCelebInfluence, type CelebInfluenceDetail } from "@/actions/home/getCelebInfluence";
import { RadarChart, InfluenceScoreInfoModal, sortCategoriesByScore, sumBaseScore } from "@/components/features/influence";
import InfluenceRankGlyph from "@/components/features/influence/InfluenceRankGlyph";
import { getInfluenceRankStyle } from "@/components/features/influence/rankMaterials";
import { Z_INDEX } from "@/constants/zIndex";
import styles from "./CelebInfluenceModal.module.css";

interface CelebInfluenceModalProps {
  celebId: string;
  isOpen: boolean;
  onClose: () => void;
  zIndex?: number;
  escapeCapture?: boolean;
}

export default function CelebInfluenceModal({ celebId, isOpen, onClose, zIndex, escapeCapture }: CelebInfluenceModalProps) {
  const t = useTranslations("home.ui.influence");
  const ti = useTranslations("profilePage.influence");
  const tProf = useTranslations("profession");
  const locale = useLocale();
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ key: string; data: CelebInfluenceDetail | null } | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [isScoreInfoOpen, setIsScoreInfoOpen] = useState(false);
  const requestKey = `${celebId}:${locale}:${attempt}`;
  const loading = result?.key !== requestKey;
  const data = result?.key === requestKey ? result.data : null;

  useEffect(() => {
    if (!isOpen || !celebId) return;
    let ignore = false;
    getCelebInfluence(celebId, locale)
      .then(data => { if (!ignore) setResult({ key: requestKey, data }); })
      .catch(() => { if (!ignore) setResult({ key: requestKey, data: null }); });
    return () => { ignore = true; };
  }, [isOpen, celebId, locale, requestKey]);

  if (!isOpen) return null;

  const rank = calculateInfluenceRank(data?.total_score ?? 0);
  const rankStyle = getInfluenceRankStyle(rank);
  const baseScore = data ? sumBaseScore(data) : 0;
  const baseMax = INFLUENCE_CATEGORY_FIELDS.reduce((sum, field) => sum + INFLUENCE_MAX_SCORES[field], 0);
  const transMax = INFLUENCE_MAX_SCORES.transhistoricity;
  const categories = data ? sortCategoriesByScore(data) : [];
  const profession = data?.profession && tProf.has(data.profession) ? tProf(data.profession) : null;
  const fallbackFields = data?.translationFallbacks ?? [];

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        ariaLabel={ti("totalInfluence")}
        frame="plain"
        widthClassName="max-w-[760px]"
        boxClassName={styles.frame}
        boxStyle={rankStyle}
        scrollAreaClassName={styles.scrollArea}
        overlayClassName="bg-black/80 backdrop-blur-sm"
        closeButtonClassName={styles.closeButton}
        animateHeight={false}
        zIndex={zIndex}
        escapeCapture={escapeCapture}
        closeOnEscape={!isScoreInfoOpen}
      >
        {loading ? (
          <PendingBlock variant="panel" minHeight="min-h-96" label={t("analyzing")} className="m-6" />
        ) : !data ? (
          <RetryBlock onRetry={() => setAttempt(value => value + 1)} message={t("loadError")} className="min-h-96 px-6" />
        ) : (
          <div className={styles.content} data-influence-detail data-influence-material={rank}>
            <header className={styles.header}>
              <div className={styles.avatar}>
                <Avatar url={data.avatar_url} name={data.nickname} size="lg" className="ring-0" />
              </div>
              <div className="min-w-0">
                <p className={styles.eyebrow}>{ti("totalInfluence")}</p>
                <h2 className={styles.name}>{data.nickname}</h2>
                {profession && <p className="mt-1 text-xs text-text-secondary">{profession}</p>}
              </div>
            </header>

            <div className={styles.overview}>
              <section className={styles.summary} aria-label={ti("totalInfluence")}>
                <div className={styles.scoreHeading}>
                  <div>
                    <p className={styles.eyebrow}>{ti("explorer.totalScoreLabel")}</p>
                    <div className={styles.total}>
                      <strong>{data.total_score}</strong>
                      <span>/ {INFLUENCE_TOTAL_MAX_SCORE}</span>
                    </div>
                  </div>
                  <div className={styles.rankSeal} aria-label={`Rank ${rank}`}>
                    <span>RANK</span>
                    <InfluenceRankGlyph rank={rank} className={styles.rankGlyph} />
                  </div>
                </div>
                <div className={styles.standing}>
                  <span>{ti("rankingLine", { ranking: data.ranking, total: data.rankedTotal })}</span>
                  <strong>{ti("percentileTop", { percent: Math.max(1, Math.round(data.percentile)) })}</strong>
                </div>
                <div className={styles.composition}>
                  {[{ label: ti("scoreInfo.domainsPart"), value: baseScore, max: baseMax },
                    { label: ti("scoreInfo.transPart"), value: data.transhistoricity, max: transMax }].map(part => (
                    <div key={part.label}>
                      <div className={styles.meterHeading}>
                        <span>{part.label}</span>
                        <span><strong>{part.value}</strong><small> / {part.max}</small></span>
                      </div>
                      <div className={styles.meter} aria-hidden><span style={{ width: `${Math.max(0, Math.min(100, part.value / part.max * 100))}%` }} /></div>
                    </div>
                  ))}
                </div>
                <button type="button" className={styles.guideButton} aria-haspopup="dialog" onClick={() => setIsScoreInfoOpen(true)}>
                  <BookOpen size={15} /><span>{ti("scoreInfo.title")}</span><ArrowUpRight size={14} />
                </button>
              </section>
              <div className={styles.radar}>
                <RadarChart data={data} size={240} activeCategory={activeCategory} onSelectCategory={key => setActiveCategory(value => value === key ? null : key)} accentColor="var(--rank-accent)" />
              </div>
            </div>

            <section className={styles.timeless}>
              <div className={styles.sectionHeading}>
                <h3><Hourglass size={17} />{ti("transhistoricity")}</h3>
                <span><strong>{data.transhistoricity}</strong><small> / {transMax}</small></span>
              </div>
              {fallbackFields.includes("transhistoricity") && <p className={styles.fallback}>{ti("originalKorean")}</p>}
              <p className={styles.explanation}>{data.transhistoricity_exp || ti("timelessFallback")}</p>
            </section>

            <section className={styles.domains}>
              <h3 className={styles.domainTitle}>{ti("categoryDetail")}</h3>
              <div className={styles.categoryGrid}>
                {categories.map(category => {
                  const Icon = category.icon;
                  const explanation = data[`${category.key}_exp`];
                  const normalized = explanation?.trim().toLowerCase();
                  const hasDetails = normalized && !["관련 없음", "관련 없음.", "not applicable", "not applicable."].includes(normalized);
                  return (
                    <article key={category.key} className={styles.category} data-category={category.key} data-active={activeCategory === category.key}>
                      <div className={styles.sectionHeading}>
                        <h4><Icon size={17} />{ti(`categories.${category.key}`)}</h4>
                        <span><strong>{category.value}</strong><small> / {INFLUENCE_MAX_SCORES[category.key]}</small></span>
                      </div>
                      <div className={styles.meter} aria-hidden><span style={{ width: `${Math.max(0, Math.min(100, category.value / INFLUENCE_MAX_SCORES[category.key] * 100))}%` }} /></div>
                      {fallbackFields.includes(category.key) && <p className={styles.fallback}>{ti("originalKorean")}</p>}
                      <p className={`${styles.explanation} ${hasDetails ? "" : "text-text-tertiary"}`}>{hasDetails ? explanation : ti("noDetails")}</p>
                    </article>
                  );
                })}
              </div>
            </section>
          </div>
        )}
      </Modal>
      {data && <InfluenceScoreInfoModal
        isOpen={isScoreInfoOpen}
        onClose={() => setIsScoreInfoOpen(false)}
        currentRank={rank}
        totalScore={data.total_score}
        baseScore={baseScore}
        transScore={data.transhistoricity}
        zIndex={(zIndex ?? Z_INDEX.modal) + 1}
        escapeCapture
      />}
    </>
  );
}
