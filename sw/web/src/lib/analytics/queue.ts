import { canTrackAnalytics } from "./policy";

type Params = Record<string, string | number | boolean>;
type Clarity = { (...args: string[]): void; q?: string[][] };
type AnalyticsWindow = Window & { gtag?: (...args: unknown[]) => void; clarity?: Clarity };
const pending: [string, Params][] = [];

/** 초기 데이터 요청이 GA 초기화보다 먼저 끝나도 결과를 잃지 않는다. */
export function sendAnalyticsEvent(name: string, params: Params) {
  if (!canTrackAnalytics()) return;
  const client = window as AnalyticsWindow;
  if (client.gtag) client.gtag("event", name, params);
  else if (pending.length < 100) pending.push([name, params]);
  if (name.startsWith("content_brief_") || name.startsWith("dialogue_audio_")) {
    client.clarity ??= Object.assign((...args: string[]) => {
      const queue = client.clarity?.q;
      if (queue && queue.length < 100) queue.push(args);
    }, { q: [] as string[][] });
    client.clarity("event", name);
    if (params.failure_reason) client.clarity("set", "failure_reason", String(params.failure_reason));
  }
}

export function flushAnalyticsEvents() {
  if (!canTrackAnalytics()) { pending.length = 0; return; }
  const client = window as AnalyticsWindow;
  if (!client.gtag) return;
  for (const [name, params] of pending.splice(0)) client.gtag("event", name, params);
}
