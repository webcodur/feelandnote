"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import CelebDetailModal from "@/components/features/celeb/modals/CelebDetailModal";
import { useCountries } from "@/hooks/useCountries";
import { getCountryNameByLocale } from "@/lib/countries";
import { useCelebPreview } from "../useCelebPreview";
import BelowInspectorCue from "./BelowInspectorCue";
import MobileRelationList from "./MobileRelationList";
import styles from "./RelationGraphSection.module.css";
import RelationInspector from "./RelationInspector";
import RelationToolbar, { type FocusOption } from "./RelationToolbar";
import { buildRelationModel, peopleForFocuses, relationFocusesForMode, typesForMode } from "./relationModel";
import type { DiagramLabels, PersonNode, RelationFocus, RelationGraphProps, RelationMode } from "./types";
import useRelationDialogue from "./useRelationDialogue";
import useViewportAnchor from "./useViewportAnchor";

const RelationDiagram = dynamic(() => import("./RelationDiagram"), { ssr: false });

export default function RelationGraphSection({ centerName, centerAvatarUrl, relations, isFiction = false }: RelationGraphProps) {
  const locale = useLocale();
  const t = useTranslations("celebPage");
  const tp = useTranslations("profession");
  useCountries();
  const model = useMemo(() => buildRelationModel(relations, locale), [relations, locale]);
  const initialMode: RelationMode = model.socialPeople.length ? "social" : "family";
  const [mode, setMode] = useState<RelationMode>(initialMode);
  const [focusByMode, setFocusByMode] = useState<Record<RelationMode, RelationFocus | null>>({
    family: null, social: null,
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [belowCue, setBelowCue] = useState(0);
  const [desktopDiagramReady, setDesktopDiagramReady] = useState(false);
  const [previewRelation, setPreviewRelation] = useState<PersonNode | null>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const captureViewportAnchor = useViewportAnchor();
  const { celeb: previewCeleb, loadingId, openCelebPreview, closeCelebPreview } = useCelebPreview("relations");
  const { speak, stateFor } = useRelationDialogue(locale);

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
    up: t("relBandUp", { name: centerName }), left: t("relBandSideL"),
    right: t("relBandSideR"), down: t("relBandDown", { name: centerName }),
  }), [t, centerName]);

  const effectiveMode: RelationMode = mode === "family" && !model.familyPeople.length
    ? "social" : mode === "social" && !model.socialPeople.length ? "family" : mode;
  const focusOptions = useMemo<FocusOption[]>(() => (effectiveMode === "family" ? [
    { key: "parents", label: labels.parents, people: model.family.parents },
    { key: "siblings", label: labels.siblings, people: model.family.siblings },
    { key: "spouses", label: labels.spouses, people: model.family.spouses },
    { key: "children", label: labels.children, people: model.family.children },
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
  useEffect(() => {
    if (!selectedId || window.matchMedia("(max-width: 900px)").matches) return;
    const frame = window.requestAnimationFrame(() => {
      const inspector = shellRef.current?.querySelector<HTMLElement>(`.${styles.desktopInspector}`);
      if (!inspector) return setBelowCue(0);
      const rect = inspector.getBoundingClientRect();
      const mostlyBelow = rect.top > window.innerHeight - Math.min(120, rect.height / 2);
      setBelowCue(mostlyBelow ? (cue) => cue + 1 : 0);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [selectedId]);
  const dismissBelowCue = useCallback(() => setBelowCue(0), []);
  const revealDesktopInspector = useCallback(() => {
    const inspector = shellRef.current?.querySelector<HTMLElement>(`.${styles.desktopInspector}`);
    setBelowCue(0);
    inspector?.scrollIntoView({
      block: "end",
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
  }, []);

  const changeMode = useCallback((next: RelationMode) => {
    captureViewportAnchor(shellRef.current?.querySelector<HTMLElement>(`.${styles.relationFilters}`) ?? null);
    setMode(next);
    setSelectedId(null);
    setBelowCue(0);
  }, [captureViewportAnchor]);

  const changeFocus = useCallback((next: RelationFocus) => {
    captureViewportAnchor(shellRef.current?.querySelector<HTMLElement>(`.${styles.relationFilters}`) ?? null);
    setFocusByMode((current) => ({
      ...current, [effectiveMode]: selectedFocus === next ? null : next,
    }));
    setSelectedId(null);
    setBelowCue(0);
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

  const inspectorProps = selected ? {
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
  } : null;

  if (!model.people.length) return null;

  return <div ref={shellRef} className={styles.shell}>
    <RelationToolbar title={t("relAllTitle", { name: centerName })} mode={effectiveMode}
      socialLabel={t("relSubSocial")} familyLabel={t("relSubFamily")}
      socialCount={model.socialPeople.length} familyCount={model.familyPeople.length}
      focusLabel={effectiveMode === "social" ? t("relSubSocial") : t("relSubFamily")}
      focusOptions={focusOptions} selectedFocus={selectedFocus}
      onModeChange={changeMode} onFocusChange={changeFocus} />

    <div className={styles.diagramOnly}>
      {desktopDiagramReady ? <RelationDiagram mode={effectiveMode} focuses={effectiveFocuses} model={model} centerName={centerName} centerAvatarUrl={centerAvatarUrl}
        labels={labels} zoomInLabel={t("timelineZoomIn")} zoomOutLabel={t("timelineZoomOut")}
        selectedId={selected?.id ?? null} onSelect={selectDesktop} /> : null}
      <MobileRelationList label={t("relAllTitle", { name: centerName })} focusOptions={focusOptions}
        selectedFocus={selectedFocus} activePeople={activePeople} relationLabel={relationLabel} />
      {belowCue > 0 && selected && <BelowInspectorCue key={belowCue} signal={belowCue}
        label={selected.name} onExpire={dismissBelowCue} onReveal={revealDesktopInspector} />}
      {desktopDiagramReady && inspectorProps && <RelationInspector {...inspectorProps} />}
    </div>

    <p className={styles.sourceNote}>{t(isFiction ? "fictionRelationGraphNote" : "relationGraphNote")}</p>
    {previewCeleb && previewRelation && <CelebDetailModal celeb={previewCeleb} isOpen
      context={{ label: relationLabel(previewRelation), description: previewRelation.note }} onClose={closePreview} />}
  </div>;
}
