"use client";

import { useEffect, useState } from "react";
import { getAtlasNavigation } from "@/actions/home/getAtlasNavigation";
import { firstAtlasEntry, type AtlasSelection, type AtlasTheme, type AtlasWorld } from "./atlasNavigationData";

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
  const draft = drafts[world] ?? { themeId: first?.id ?? "", entryId: first ? firstAtlasEntry(first)?.id ?? null : null, groupId: null };
  return {
    world, tree: currentTree ?? [], draft, error, loading: !currentTree && !error,
    switchWorld: (next: AtlasWorld) => { if (next !== world) { setError(false); setWorld(next); } },
    setDraft: (next: AtlasSelection) => setDrafts((previous) => ({ ...previous, [world]: next })),
    retry: () => { setError(false); setAttempt((previous) => previous + 1); },
  };
}
