"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import CelebSectionSkeleton from "@/components/features/celeb/CelebSectionSkeleton";
import { useCountries } from "@/hooks/useCountries";
import { getCountryNameByLocale } from "@/lib/countries";
import MobileRelationGraph from "./MobileRelationGraph";
import styles from "./RelationGraphSection.module.css";
import RelationInspector from "./RelationInspector";
import RelationToolbar, { type FocusOption } from "./RelationToolbar";
import { buildRelationModel, peopleForFocuses, relationFocusesForMode, typesForMode } from "./relationModel";
import type { DiagramLabels, PersonNode, RelationFocus, RelationGraphProps } from "./types";
import useRelationDialogue from "@/hooks/useRelationDialogue";
import { graphStageHeight } from "./graphLayout";
import { useNearViewport } from "@/components/ui/pending";
import useViewportAnchor from "./useViewportAnchor";

const RelationDiagram = dynamic(() => import("./RelationDiagram"), {
  ssr: false,
  loading: () => <CelebSectionSkeleton kind="graph" />,
});

export default function RelationGraphSection({
  centerName,
  centerAvatarUrl,
  relations,
  centerProfile,
}: RelationGraphProps) {
  const locale = useLocale();
  const t = useTranslations("celebPage");
  const tp = useTranslations("profession");
  useCountries();
  const model = useMemo(() => buildRelationModel(relations, locale), [relations, locale]);
  const effectiveMode = 'social' as const;
  const [storedFocus, setStoredFocus] = useState<RelationFocus | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [desktopDiagramReady, setDesktopDiagramReady] = useState(false);
  const shellRef = useRef<HTMLDivElement>(null);
  const { ref: diagramRef, isNear } = useNearViewport();
  const captureViewportAnchor = useViewportAnchor();
  const { speak, stateFor } = useRelationDialogue(locale);

  const isCenterSelected = selectedId === "__CENTER__";
  const selectCenter = useCallback(() => {
    setSelectedId("__CENTER__");
  }, []);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 901px)");
    const sync = () => setDesktopDiagramReady(desktop.matches);
    sync();
    desktop.addEventListener("change", sync);
    return () => desktop.removeEventListener("change", sync);
  }, []);

  const labels = useMemo<DiagramLabels>(() => ({
    parents: t("relType_parent"), siblings: t("relType_sibling"),
    spouses: t("relType_spouse"), children: t("relType_child"),
    up: t("relBandUp", { name: centerName }),
    left: t("relBandSideL"),
    right: t("relBandSideR"), down: t("relBandDown", { name: centerName }),
  }), [t, centerName]);

  const focusOptions = useMemo<FocusOption[]>(() => [
    { key: "up", label: t("relAxis_received"), people: model.social.up },
    { key: "left", label: labels.left, people: model.social.left },
    { key: "right", label: labels.right, people: model.social.right },
    { key: "down", label: t("relAxis_given"), people: model.social.down },
  ], [labels, model, t]);
  const availableFocuses = useMemo(
    () => relationFocusesForMode(model, effectiveMode), [model, effectiveMode],
  );
  const selectedFocus = storedFocus && availableFocuses.includes(storedFocus) ? storedFocus : null;
  const effectiveFocuses = useMemo(
    () => selectedFocus ? [selectedFocus] : availableFocuses,
    [availableFocuses, selectedFocus],
  );
  const activePeople = useMemo(
    () => peopleForFocuses(model, effectiveMode, effectiveFocuses),
    [model, effectiveMode, effectiveFocuses],
  );
  const selected = activePeople.find((person) => person.id === selectedId) ?? activePeople[0] ?? null;
  const speaker = selected ? stateFor(selected) : null;

  const relationLabel = useCallback((person: PersonNode) => typesForMode(person, effectiveMode)
    .map((type) => t.has(`relType_${type}`) ? t(`relType_${type}`) : type)
    .join(" · "), [effectiveMode, t]);

  const selectDesktop = useCallback((person: PersonNode) => setSelectedId(person.id), []);

  const changeFocus = useCallback((next: RelationFocus) => {
    captureViewportAnchor(shellRef.current?.querySelector<HTMLElement>(`.${styles.relationFilters}`) ?? null);
    setStoredFocus(selectedFocus === next ? null : next);
    setSelectedId(null);
  }, [captureViewportAnchor, effectiveMode, selectedFocus]);

  const centerPerson: PersonNode | null = centerProfile ? {
    id: centerProfile.id,
    slug: centerProfile.slug,
    listed: Boolean(centerProfile.slug),
    name: centerName,
    avatarUrl: centerAvatarUrl,
    types: [],
    groups: [],
    note: centerProfile.headline || (
      locale === "en"
        ? `Center of this relation network, connected to ${model.people.length} figures.`
        : `관계망의 중심 인물로, 총 ${model.people.length}명의 인물과 연결되어 있습니다.`
    ),
    profession: centerProfile.profession ?? null,
    nationality: centerProfile.nationality ?? null,
    birthDate: centerProfile.birth_date ?? null,
    deathDate: centerProfile.death_date ?? null,
    qid: centerProfile.wikidata_qid ?? null,
  } : null;
  const centerSpeaker = centerPerson ? stateFor(centerPerson) : null;

  const inspectorProps = isCenterSelected ? {
    isCenter: true,
    person: centerPerson ?? {
      id: "__CENTER__",
      slug: null,
      listed: false,
      name: centerName,
      avatarUrl: centerAvatarUrl,
      types: [],
      groups: [],
      note: locale === "en"
        ? `Center of this relation network, connected to ${model.people.length} figures.`
        : `관계망의 중심 인물로, 총 ${model.people.length}명의 인물과 연결되어 있습니다.`,
      profession: null,
      nationality: null,
      birthDate: null,
      deathDate: null,
      qid: null,
    },
    relationLabel: locale === "en"
      ? `Network Center (${model.people.length} figures)`
      : `관계망 중심 (총 ${model.people.length}명 연결)`,
    position: 0,
    total: model.people.length,
    profession: centerProfile?.profession ? tp(centerProfile.profession) : null,
    country: centerProfile?.nationality ? getCountryNameByLocale(centerProfile.nationality, locale) : null,
    goLabel: t("relGoPersonPage"),
    wikidataLabel: t("relViewWikidata"),
    speakLabel: t(centerSpeaker?.hasVoice ? "playGreetingVoice" : "dialogue_greeting"),
    speakingLoading: centerSpeaker?.loading,
    hasVoice: centerSpeaker?.hasVoice,
    voicePulse: centerSpeaker?.pulse,
    onSpeak: centerSpeaker?.canSpeak && centerPerson ? () => void speak(centerPerson) : undefined,
    headline: centerProfile?.headline ?? null,
    quotes: centerProfile?.quotes ?? null,
    titleBadge: centerProfile?.title ?? null,
    centerBreakdown: {
      received: model.social.up.length,
      given: model.social.down.length,
      cooperation: model.social.left.length,
      opposition: model.social.right.length,
    },
    locale,
  } : selected ? {
    person: selected, relationLabel: relationLabel(selected),
    position: activePeople.indexOf(selected) + 1, total: activePeople.length,
    profession: selected.profession ? tp(selected.profession) : null,
    country: selected.nationality ? getCountryNameByLocale(selected.nationality, locale) : null,
    goLabel: t("relGoPersonPage"), wikidataLabel: t("relViewWikidata"),
    speakLabel: t(speaker?.hasVoice ? "playGreetingVoice" : "dialogue_greeting"),
    speakingLoading: speaker?.loading, hasVoice: speaker?.hasVoice, voicePulse: speaker?.pulse,
    onSpeak: speaker?.canSpeak ? () => void speak(selected) : undefined,
    locale,
  } : null;

  if (!model.people.length) return null;

  return <div ref={shellRef} className={styles.shell}>
    <RelationToolbar focusLabel={t("relAxesLabel")}
      focusOptions={focusOptions} selectedFocus={selectedFocus}
      onFocusChange={changeFocus} />

    <div className={styles.diagramOnly}>
      <div ref={diagramRef} className="hidden min-[901px]:block" style={{ height: graphStageHeight(effectiveMode, model, effectiveFocuses) }}>
        {!(desktopDiagramReady && isNear) && <CelebSectionSkeleton kind="graph" />}
        {desktopDiagramReady && isNear && <RelationDiagram mode={effectiveMode} focuses={effectiveFocuses} model={model} centerName={centerName} centerAvatarUrl={centerAvatarUrl}
        labels={labels} zoomInLabel={t("timelineZoomIn")} zoomOutLabel={t("timelineZoomOut")}
        selectedId={isCenterSelected ? "__CENTER__" : (selected?.id ?? null)}
        onSelect={selectDesktop}
        onSelectCenter={selectCenter} />}
      </div>
      <MobileRelationGraph key={`${effectiveMode}:${selectedFocus ?? "all"}`}
        centerName={centerName} focusOptions={focusOptions}
        selectedFocus={selectedFocus} selectedId={selectedId} onFocusChange={changeFocus} onSelect={selectDesktop} relationLabel={relationLabel}
      />
      {inspectorProps && <RelationInspector {...inspectorProps} />}
    </div>

  </div>;
}
