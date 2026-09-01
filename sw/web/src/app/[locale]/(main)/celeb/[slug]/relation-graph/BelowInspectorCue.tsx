"use client";

import { ChevronDown } from "lucide-react";
import { useEffect } from "react";

import styles from "./RelationGraphSection.module.css";

interface Props {
  label: string;
  signal: number;
  onExpire: () => void;
  onReveal: () => void;
}

const CUE_LIFETIME = 8000;

export default function BelowInspectorCue({ label, signal, onExpire, onReveal }: Props) {
  useEffect(() => {
    const timer = window.setTimeout(onExpire, CUE_LIFETIME);
    return () => window.clearTimeout(timer);
  }, [onExpire, signal]);

  return <div className={styles.belowCue}>
    <i aria-hidden="true" /><i aria-hidden="true" />
    <button type="button" aria-label={label} title={label} onClick={onReveal}>
      <ChevronDown aria-hidden="true" />
    </button>
  </div>;
}
