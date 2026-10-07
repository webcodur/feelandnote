"use client";

import { lazy, Suspense } from "react";
import SharedSourceLink, { type SourceLinkProps } from "@feelandnote/shared/ui/source-link";
import { Z_INDEX } from "@/constants/zIndex";

const SourceLinksModal = lazy(() => import("./SourceLinksModal"));

export default function SourceLink(props: SourceLinkProps) {
  return <SharedSourceLink {...props} baseLayer={Z_INDEX.modal}
    renderSources={list => <Suspense fallback={null}><SourceLinksModal {...list} /></Suspense>} />;
}
