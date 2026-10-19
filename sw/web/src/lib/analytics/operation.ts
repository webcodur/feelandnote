import { trackEvent } from "./track";

type Operation = "content_brief" | "dialogue_audio";
type Outcome = "attempt" | "started" | "success" | "failure" | "empty" | "blocked" | "cancelled";
export type OperationEventName = `${Operation}_${Outcome}`;
export type FailureReason = "request" | "network" | "decode" | "unsupported" | "timeout" | "playback";
type Emit = (event: OperationEventName, params: Record<string, string | number>) => void;

/** URL·본문·예외 메시지 없이 기능 이름과 결과만 기록한다. */
export function beginOperation(operation: Operation, kind: string, emit: Emit = trackEvent) {
  const started = Date.now();
  let settled = false;
  let playing = false;
  emit(`${operation}_attempt`, { kind });
  return (outcome: Exclude<Outcome, "attempt">, reason?: FailureReason) => {
    if (settled) return;
    if (outcome === "started") {
      if (playing) return;
      playing = true;
    } else settled = true;
    emit(`${operation}_${outcome}`, {
      kind,
      duration_ms: Math.max(0, Date.now() - started),
      ...(reason && { failure_reason: reason }),
    });
  };
}

export function audioFailureReason(code: number | undefined): FailureReason {
  return code === 2 ? "network" : code === 3 ? "decode" : code === 4 ? "unsupported" : "playback";
}
