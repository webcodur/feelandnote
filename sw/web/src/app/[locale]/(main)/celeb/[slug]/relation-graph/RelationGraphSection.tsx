"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import CelebDetailModal from "@/components/features/celeb/modals/CelebDetailModal";
import { useCountries } from "@/hooks/useCountries";
import { getCountryNameByLocale } from "@/lib/countries";
import { useCelebPreview } from "../useCelebPreview";
import MobileRelationList from "./MobileRelationList";
import styles from "./RelationGraphSection.module.css";
import RelationInspector from "./RelationInspector";
import RelationToolbar, { type FocusOption } from "./RelationToolbar";
import { buildRelationModel, OTHER_FOCUS, peopleForFocuses, relationFocusesForMode, typesForMode } from "./relationModel";
import type { DiagramLabels, PersonNode, RelationFocus, RelationGraphProps, RelationMode } from "./types";
import useRelationDialogue from "./useRelationDialogue";
import useViewportAnchor from "./useViewportAnchor";

const RelationDiagram = dynamic(() => import("./RelationDiagram"), { ssr: false });

export default function RelationGraphSection({
  centerName,
  centerAvatarUrl,
  relations,
  isFiction = false,
  centerProfile,
}: RelationGraphProps) {
  const locale = useLocale();
  const t = useTranslations("celebPage");
  const tp = useTranslations("profession");
  useCountries();
  const model = useMemo(() => buildRelationModel(relations, locale), [relations, locale]);
  const initialMode: RelationMode = model.socialPeople.length
    ? "social" : model.familyPeople.length ? "family" : "other";
  const [mode, setMode] = useState<RelationMode>(initialMode);
  const [focusByMode, setFocusByMode] = useState<Record<RelationMode, RelationFocus | null>>({
    family: null, social: null, other: null,
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [desktopDiagramReady, setDesktopDiagramReady] = useState(false);
  const [previewRelation, setPreviewRelation] = useState<PersonNode | null>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const captureViewportAnchor = useViewportAnchor();
  const { celeb: previewCeleb, loadingId, openCelebPreview, closeCelebPreview } = useCelebPreview("relations");
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

  const modeCounts = useMemo<Record<RelationMode, number>>(() => ({
    family: model.familyPeople.length, social: model.socialPeople.length, other: model.other.length,
  }), [model]);
  // 고른 갈래가 비어 있으면 사람이 있는 갈래로 물러선다
  const effectiveMode: RelationMode = modeCounts[mode]
    ? mode : (["social", "family", "other"] as const).find((key) => modeCounts[key]) ?? mode;

  // 기타 자리의 이름표. 탭 이름을 되풀이하지 않고 실제 관계 이름(대응 신격 등)을 적는다.
  // 종류가 섞여 있을 때만 「기타」로 물러선다.
  const otherLabel = useMemo(() => {
    const types = [...new Set(model.other.flatMap((person) => person.types))];
    return types.length === 1 && t.has(`relType_${types[0]}`) ? t(`relType_${types[0]}`) : t("relSubOther");
  }, [model.other, t]);

  const labels = useMemo<DiagramLabels>(() => ({
    parents: t("relType_parent"), siblings: t("relType_sibling"),
    spouses: t("relType_spouse"), children: t("relType_child"),
    up: t("relBandUp", { name: centerName }),
    // 기타는 왼쪽 자리 하나만 쓰므로 그 자리 이름표가 곧 기타 갈래의 이름표다
    left: effectiveMode === "other" ? otherLabel : t("relBandSideL"),
    right: t("relBandSideR"), down: t("relBandDown", { name: centerName }),
  }), [t, centerName, effectiveMode, otherLabel]);

  const focusOptions = useMemo<FocusOption[]>(() => (effectiveMode === "family" ? [
    { key: "parents", label: labels.parents, people: model.family.parents },
    { key: "siblings", label: labels.siblings, people: model.family.siblings },
    { key: "spouses", label: labels.spouses, people: model.family.spouses },
    { key: "children", label: labels.children, people: model.family.children },
  ] : effectiveMode === "other" ? [
    { key: OTHER_FOCUS, label: labels.left, people: model.other },
  ] : [
    { key: "up", label: t("relType_influence"), people: model.social.up },
    { key: "left", label: labels.left, people: model.social.left },
    { key: "right", label: labels.right, people: model.social.right },
    { key: "down", label: t("relType_influenced"), people: model.social.down },
  ]) as FocusOption[], [effectiveMode, labels, model, t]);
  const availableFocuses = useMemo(
    () => relationFocusesForMode(model, effectiveMode), [model, effectiveMode],
  );
  const storedFocus = focusByMode[effectiveMode];
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

  const changeMode = useCallback((next: RelationMode) => {
    captureViewportAnchor(shellRef.current?.querySelector<HTMLElement>(`.${styles.relationFilters}`) ?? null);
    setMode(next);
    setSelectedId(null);
  }, [captureViewportAnchor]);

  const changeFocus = useCallback((next: RelationFocus) => {
    captureViewportAnchor(shellRef.current?.querySelector<HTMLElement>(`.${styles.relationFilters}`) ?? null);
    setFocusByMode((current) => ({
      ...current, [effectiveMode]: selectedFocus === next ? null : next,
    }));
    setSelectedId(null);
  }, [captureViewportAnchor, effectiveMode, selectedFocus]);

  const openPerson = async (person: PersonNode) => {
    setPreviewRelation(person);
    const result = await openCelebPreview(person.id);
    if (!result) setPreviewRelation(null);
  };

  const closePreview = () => {
    closeCelebPreview();
    setPreviewRelation(null);
  };

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
    loading: false,
    openLabel: t("relViewPersonCard"),
    wikidataLabel: t("relViewWikidata"),
    onOpen: () => {
      document.getElementById("introduction")?.scrollIntoView({ behavior: "smooth" });
    },
    speakLabel: t(centerSpeaker?.hasVoice ? "playGreetingVoice" : "dialogue_greeting"),
    speakingLoading: centerSpeaker?.loading,
    hasVoice: centerSpeaker?.hasVoice,
    voicePulse: centerSpeaker?.pulse,
    onSpeak: centerSpeaker?.canSpeak && centerPerson ? () => void speak(centerPerson) : undefined,
    headline: centerProfile?.headline ?? null,
    quotes: centerProfile?.quotes ?? null,
    titleBadge: centerProfile?.title ?? null,
    centerBreakdown: {
      social: model.socialPeople.length,
      family: model.familyPeople.length,
      other: model.other.length,
    },
    locale,
  } : selected ? {
    person: selected, relationLabel: relationLabel(selected),
    position: activePeople.indexOf(selected) + 1, total: activePeople.length,
    profession: selected.profession ? tp(selected.profession) : null,
    country: selected.nationality ? getCountryNameByLocale(selected.nationality, locale) : null,
    loading: loadingId === selected.id, openLabel: t("relViewPersonCard"),
    wikidataLabel: t("relViewWikidata"),
    onOpen: () => void openPerson(selected),
    speakLabel: t(speaker?.hasVoice ? "playGreetingVoice" : "dialogue_greeting"),
    speakingLoading: speaker?.loading, hasVoice: speaker?.hasVoice, voicePulse: speaker?.pulse,
    onSpeak: speaker?.canSpeak ? () => void speak(selected) : undefined,
    locale,
  } : null;

  if (!model.people.length) return null;

  return <div ref={shellRef} className={styles.shell}>
    <RelationToolbar title={t("relAllTitle", { name: centerName })} mode={effectiveMode}
      modeTabs={[
        { key: "social", label: t("relSubSocial"), count: modeCounts.social },
        { key: "family", label: t("relSubFamily"), count: modeCounts.family },
        { key: "other", label: t("relSubOther"), count: modeCounts.other },
      ]}
      focusLabel={t(effectiveMode === "social" ? "relSubSocial" : effectiveMode === "family" ? "relSubFamily" : "relSubOther")}
      focusOptions={focusOptions} selectedFocus={selectedFocus}
      onModeChange={changeMode} onFocusChange={changeFocus} />

    <div className={styles.diagramOnly}>
      {desktopDiagramReady ? <RelationDiagram mode={effectiveMode} focuses={effectiveFocuses} model={model} centerName={centerName} centerAvatarUrl={centerAvatarUrl}
        labels={labels} zoomInLabel={t("timelineZoomIn")} zoomOutLabel={t("timelineZoomOut")}
        selectedId={isCenterSelected ? "__CENTER__" : (selected?.id ?? null)}
        onSelect={selectDesktop}
        onSelectCenter={selectCenter} /> : null}
      <MobileRelationList label={t("relAllTitle", { name: centerName })} focusOptions={focusOptions}
        selectedFocus={selectedFocus} activePeople={activePeople} relationLabel={relationLabel}
        onOpenPerson={(person) => void openPerson(person)} openLabel={t("relViewPersonCard")} />
      {desktopDiagramReady && inspectorProps && <RelationInspector {...inspectorProps} />}
    </div>

    <p className={styles.sourceNote}>{t(isFiction ? "fictionRelationGraphNote" : "relationGraphNote")}</p>
    {previewCeleb && previewRelation && <CelebDetailModal celeb={previewCeleb} isOpen
      context={{ label: relationLabel(previewRelation), description: previewRelation.note }} onClose={closePreview} />}
  </div>;
}
