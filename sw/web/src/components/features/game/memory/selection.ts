import type { MemoryPairResult } from "./types";

export type MemorySelectionGate =
  | "select"
  | "finish-result"
  | "advance-match"
  | "ignore";

interface MemorySelectionGateInput {
  pairResult: MemoryPairResult;
  isOpen: boolean;
  locked: boolean;
  isMatched: boolean;
}

export function getMemorySelectionGate({
  pairResult,
  isOpen,
  locked,
  isMatched,
}: MemorySelectionGateInput): MemorySelectionGate {
  if (isMatched) return "ignore";
  if (pairResult !== null && isOpen) return "finish-result";
  if (pairResult === "match" && locked) return "advance-match";
  if (locked) return "ignore";
  return "select";
}
