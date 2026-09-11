import type { UserContentWithContent } from "@/actions/contents/getMyContents";

import type {
  ContentDatasetMode,
  ContentLibraryDataOptions,
  ContentRequest,
} from "./contentLibraryDataState";
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
