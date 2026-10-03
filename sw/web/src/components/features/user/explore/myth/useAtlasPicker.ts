"use client";

import { useEffect, useState } from "react";
import { getAtlasNavigation } from "@/actions/home/getAtlasNavigation";
import { firstAtlasEntry, type AtlasSelection, type AtlasTheme, type AtlasWorld } from "./atlasNavigationData";
import { lastMythFromCookies, MYTH_OPENING_SLUG, mythHref } from "./mythHref";

export function useAtlasPicker(tree: AtlasTheme[], selection: AtlasSelection, myth: boolean) {
  const initialWorld: AtlasWorld = myth ? "myth" : "faction";
  const [world, setWorld] = useState<AtlasWorld>(initialWorld);
  const [trees, setTrees] = useState<Partial<Record<AtlasWorld, AtlasTheme[]>>>({ [initialWorld]: tree });
  const [drafts, setDrafts] = useState<Partial<Record<AtlasWorld, AtlasSelection>>>({ [initialWorld]: selection });
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const currentTree = trees[world];

  useEffect(() => {
    if (currentTree) return;
    let cancelled = false;
    getAtlasNavigation(world === "myth").then((next) => {
      if (!cancelled) setTrees((previous) => ({ ...previous, [world]: next }));
    }).catch(() => {
      if (!cancelled) setError(true);
    });
    return () => { cancelled = true; };
  }, [world, currentTree, attempt]);

  const first = currentTree?.find((theme) => firstAtlasEntry(theme));
  // 다른 세계에서 신화로 처음 넘어올 때도 지역 순서와 오디세이아 첫 선택은 별개다.
  const remembered = typeof document === "undefined" ? null : lastMythFromCookies(document.cookie);
  const entries = world === "myth" ? currentTree?.flatMap(theme => theme.entries.map(entry => ({ theme, entry }))) : undefined;
  const opening = entries?.find(({ entry }) => remembered && entry.href === mythHref(remembered) && !entry.disabled)
    ?? entries?.find(({ entry }) => entry.href === mythHref(MYTH_OPENING_SLUG) && !entry.disabled);
  const draft = drafts[world] ?? { themeId: opening?.theme.id ?? first?.id ?? "", entryId: opening?.entry.id ?? (first ? firstAtlasEntry(first)?.id ?? null : null), groupId: null };
  return {
    world, tree: currentTree ?? [], draft, error, loading: !currentTree && !error,
    switchWorld: (next: AtlasWorld) => { if (next !== world) { setError(false); setWorld(next); } },
    setDraft: (next: AtlasSelection) => setDrafts((previous) => ({ ...previous, [world]: next })),
    retry: () => { setError(false); setAttempt((previous) => previous + 1); },
  };
}
