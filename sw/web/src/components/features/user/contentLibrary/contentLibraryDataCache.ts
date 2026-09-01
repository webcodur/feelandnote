import type { UserContentWithContent } from "@/actions/contents/getMyContents";

import type {
  ContentDatasetMode,
  ContentLibraryDataOptions,
  ContentRequest,
  LibrarySeed,
} from "./contentLibraryDataState";
import { createContentRequest } from "./contentLibraryDataState";
import type { ViewMode } from "./contentLibraryTypes";

export interface ContentDatasetSnapshot {
  contents: UserContentWithContent[];
  mode: ContentDatasetMode;
  totalPages: number;
  total: number;
}

interface DatasetKeyInput {
  isViewer: boolean;
  ownerKind: ContentLibraryDataOptions["ownerKind"];
  request: ContentRequest;
  targetUserId?: string;
  viewMode: ViewMode;
}

export function createContentDatasetKey(input: DatasetKeyInput): string {
  return JSON.stringify([
    input.isViewer,
    input.ownerKind,
    input.targetUserId ?? null,
    input.viewMode,
    input.request,
  ]);
}

export function createContentDatasetKeyForOptions(
  options: ContentLibraryDataOptions,
  viewMode: ViewMode,
): string {
  return createContentDatasetKey({
    isViewer: options.isViewer,
    ownerKind: options.ownerKind,
    request: createContentRequest({ ...options, viewMode }),
    targetUserId: options.targetUserId,
    viewMode,
  });
}

export function createSeedDatasetCache(
  options: ContentLibraryDataOptions,
  seed: LibrarySeed | null,
): Map<string, ContentDatasetSnapshot> {
  const cache = new Map<string, ContentDatasetSnapshot>();
  if (!seed) return cache;

  const viewMode: ViewMode = "list";
  const key = createContentDatasetKeyForOptions(options, viewMode);
  cache.set(key, { ...seed, mode: viewMode });
  return cache;
}
