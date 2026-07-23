"use client";

import { ArrowDown, Minus, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

import styles from "./CelebServiceAtlas.module.css";
import type { ServiceTarget } from "./CelebServiceNavigator";

export interface ServiceItem {
  key: string;
  chapter: string;
  label: string;
  icon: LucideIcon;
  ready: boolean;
  eligible?: boolean;
  target: ServiceTarget;
  companion?: {
    label: string;
    icon: LucideIcon;
    ready: boolean;
  };
}

interface Props {
  items: ServiceItem[];
  onNavigate: (target: ServiceTarget) => void;
}

export default function CelebServiceAtlas({ items, onNavigate }: Props) {
  return (
    <div
      className={cn(
        styles.atlas,
        "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
      )}
    >
      {items.map((item) => (
        <ServiceSeal
          key={item.key}
          item={item}
          onNavigate={onNavigate}
        />
      ))}
    </div>
  );
}

function ServiceSeal({
  item,
  onNavigate,
}: {
  item: ServiceItem;
  onNavigate: (target: ServiceTarget) => void;
}) {
  const t = useTranslations("celebPage");
  const Icon = item.icon;
  const CompanionIcon = item.companion?.icon;
  const content = (
    <>
      <span className={styles.seal} aria-hidden>
        <Icon size={21} strokeWidth={1.7} />
      </span>
      <span className={styles.copy}>
        <span className={styles.titleLine}>
          <span className={styles.chapter} aria-hidden>{item.chapter}</span>
          <span className={cn(styles.label, "font-serif text-sm text-text-primary")}>
            {item.label}
          </span>
        </span>
        {!item.ready && (
          <span className={styles.primaryPending}>
            {t(item.companion ? "serviceContentPreparing" : "servicePreparing")}
          </span>
        )}
        {item.companion && CompanionIcon && (
          <span
            className={cn(
              styles.companion,
              item.companion.ready ? styles.companionReady : styles.companionPending,
            )}
          >
            <CompanionIcon size={13} strokeWidth={1.8} aria-hidden />
            <span>{item.companion.label}</span>
            <span>
              {t(item.companion.ready ? "serviceAvailable" : "servicePreparing")}
            </span>
          </span>
        )}
      </span>
      <span
        className={cn(
          styles.destination,
          item.ready ? styles.destinationReady : styles.destinationPending,
        )}
        aria-hidden
      >
        {item.ready ? (
          <ArrowDown size={16} strokeWidth={1.8} />
        ) : (
          <Minus size={15} strokeWidth={1.8} />
        )}
      </span>
    </>
  );

  if (item.ready) {
    return (
      <button
        type="button"
        onClick={() => onNavigate(item.target)}
        className={cn(
          styles.tile,
          styles.ready,
          "flex min-h-[82px] items-center gap-4 px-4 py-3 text-text-secondary",
        )}
      >
        {content}
      </button>
    );
  }

  return (
    <div
      className={cn(
        styles.tile,
        styles.pending,
        "flex min-h-[82px] cursor-not-allowed items-center gap-4 px-4 py-3",
      )}
      aria-label={`${item.label}, ${t("servicePreparing")}`}
    >
      {content}
    </div>
  );
}
