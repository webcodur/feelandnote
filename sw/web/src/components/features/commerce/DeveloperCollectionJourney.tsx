"use client";

import dynamic from "next/dynamic";
import { useLocale } from "next-intl";
import { isDeveloperMode } from "@/lib/developer-mode";
import { findJourney, type JourneyTarget } from "./prototype/catalog";

const CollectionJourney = dynamic(() => import("./prototype/CollectionJourney"));
const DeveloperCommerceFallback = dynamic(() => import("./DeveloperCommerceFallback"));

/** 실제로 보고 있는 작품과 일치하는 모형만 연결한다. 운영·영문에서는 로드하지 않는다. */
export default function DeveloperCollectionJourney({ target, placement, context }: {
  target: JourneyTarget; placement: string; context?: string;
}) {
  const locale = useLocale();
  if (!isDeveloperMode() || locale !== "ko" || target.type === "MUSIC") return null;
  const id = findJourney(target);
  if (!id) return placement === "celeb-review" || placement === "content-detail" || placement === "creative-work"
    ? <DeveloperCommerceFallback target={target} placement={placement} context={context} />
    : null;
  return <CollectionJourney key={id} id={id} placement={placement} context={context} compact />;
}
