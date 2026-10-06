"use client";

import { useCallback, useState, useSyncExternalStore, type ReactNode } from "react";
import { Images, Loader2, PanelTop, Play, Square } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { Myth } from "@/actions/home/mythTypes";
import { BlurDissolve } from "@/components/ui";
import FactionArtworkViewer from "@/components/features/faction/FactionArtworkViewer";
import FactionArtworkTitle from "@/components/features/faction/FactionArtworkTitle";
import MythTitleImage from "./MythTitleImage";
import MythOverviewReading from "./MythOverviewReading";
import { MYTH_LAYOUT as layout } from "./mythLayout";
import { useFactionDescVoice } from "@/hooks/useFactionDescVoice";
import { useReadingNarration } from "@/hooks/useReadingNarration";

interface Props {
  myth: Myth;
  memberCount: number;
  workCount: number;
  overviewLabel?: string;
  fallback?: string;
  navigation: (overview: ReactNode) => ReactNode;
  participation?: ReactNode;
}

// 저장값은 읽기만 하고 갱신 구독은 없다 — 이 컴포넌트가 스스로 쓴다
const subscribeNone = () => () => {};

// 낮은 표지의 이미지 확대와 개요 읽기는 별도 조작으로 연다.
export default function MythOverview({ myth, memberCount, workCount, overviewLabel, fallback, navigation, participation }: Props) {
  const t = useTranslations("explore.hub.myth");
  const tVoice = useTranslations("celebPage");
  const locale = useLocale() === "en" ? "en" : "ko";
  const text = myth.description ?? fallback ?? t("mythOverviewFallback");
  const voice = useFactionDescVoice(myth.id, locale, text);
  const narration = useReadingNarration(voice?.audioUrl ?? "");
  const playing = narration.status === "playing" || narration.status === "loading";
  const playbackLabel = tVoice(playing ? "readingStop" : narration.status === "paused" ? "readingResume" : "readingPlay");
  const [reading, setReading] = useState(false);
  const [zoom, setZoom] = useState(false);
  const [scenesOpen, setScenesOpen] = useState(false);
  // 뷰어를 닫아도 읽던 장면 번호를 잃지 않는다 — 다시 열면 그 자리에서 이어간다.
  // 장면 번호는 localStorage에도 둔다 — 다른 신화로 갔다 오거나 페이지를 나갔다 와도 이 기기에서 이어 읽는다
  const [artworkIndex, setArtworkIndex] = useState(0);
  const [sessionIndex, setSessionIndex] = useState<number | null>(null);
  const sceneStorageKey = `myth-scene:${myth.id}`;
  const readSavedScene = useCallback(() => localStorage.getItem(sceneStorageKey), [sceneStorageKey]);
  const savedScene = useSyncExternalStore(subscribeNone, readSavedScene, () => null);
  const closeReading = useCallback(() => setReading(false), []);
  const closeZoom = useCallback(() => setZoom(false), []);
  const closeScenes = useCallback(() => setScenesOpen(false), []);
  const [unavailable, setUnavailable] = useState<string[]>([]);
  const images = myth.images.filter((image) => !unavailable.includes(image.url));
  const cover = images[0] ?? null;
  const scenes = images.filter(image => image.kind === 'scene');
  // 이번 마운트에서 뷰어가 보고한 번호가 우선, 없으면 기기에 저장된 번호. 장면 수가 줄어도 범위 안으로 자른다
  const storedIndex = sessionIndex ?? Number(savedScene ?? 0);
  const sceneIndex = scenes.length > 0 && Number.isFinite(storedIndex)
    ? Math.min(Math.max(Math.trunc(storedIndex), 0), scenes.length - 1) : 0;
  const handleSceneIndex = useCallback((next: number) => {
    setSessionIndex(next);
    try { localStorage.setItem(sceneStorageKey, String(next)); } catch { /* 사파리 프라이빗 등 저장 실패는 무시한다 */ }
  }, [sceneStorageKey]);
  /* 장면 뷰어의 맨 앞 슬라이드는 대표 이미지다 — 장면이 있는 신화도 표지로 돌아갈 길을 둔다(26.09.30 유저 지시).
     읽던 장면 번호(localStorage·개요 칸)는 장면만 센 scenes 좌표라 뷰어 번호와 shift 만큼 어긋난다.
     -1은 맨 앞 표지 슬라이드 — 뷰어가 표지에서 닫혀도 그 자리가 미리보기에 남는다 */
  const coverSlide = cover && cover.kind !== 'scene' ? { ...cover, kind: 'scene' as const, label: cover.label ?? t('coverImage') } : null;
  const viewerImages = coverSlide ? [coverSlide, ...scenes] : scenes;
  const viewerShift = coverSlide ? 1 : 0;
  const atCover = viewerShift > 0 && Number.isFinite(storedIndex) && storedIndex < 0;
  /* 이미지박스는 마지막으로 읽던 자리를 띄운다 — 표지에서 닫혔으면 표지, 장면이 없으면 표지 그대로 */
  const displayImage = scenes.length > 0 ? (atCover ? cover : scenes[sceneIndex] ?? scenes[0]) : cover;
  /* 다시 열 때는 닫힌 슬라이드로 — 표지(-1)는 뷰어 번호 0. 엔딩은 읽던 자리로 남기지 않고 마지막 장면에 둔다 */
  const openIndex = Number.isFinite(storedIndex)
    ? Math.min(Math.max(Math.trunc(storedIndex) + viewerShift, 0), Math.max(viewerImages.length - 1, 0))
    : 0;
  const label = overviewLabel ?? t("mythOverview");

  return (
    <>
      {/* 이름과 한 줄 정의는 구획 머리(HubSection)가 쥔다 — 여기서 또 그리면 번호 머리와 이름이 겹쳐 선다 */}
      <div data-artwork={displayImage ? "available" : "absent"}
        className={`${layout.selectionDetails} ${displayImage ? "" : layout.selectionWithoutArtwork}`}>
        <div className={layout.selectionControls}>
          {navigation(
            <div className="flex min-w-fit flex-1 flex-wrap items-stretch gap-1.5">
              <button type="button" data-overview-trigger aria-label={`${myth.name} · ${label}`}
                aria-haspopup="dialog" aria-expanded={reading} onClick={() => setReading(true)}
                className={layout.overviewButton}>
                <PanelTop size={16} className="shrink-0" aria-hidden />{label}
              </button>
              {narration.available && <button type="button" data-overview-playback aria-pressed={playing}
                aria-label={`${label} · ${playbackLabel}`} title={playbackLabel} aria-busy={narration.status === "loading" || undefined}
                onClick={playing ? narration.stop : narration.play}
                className={`grid size-10 shrink-0 place-items-center rounded-lg border outline-none hover:border-accent hover:bg-accent/15 focus-visible:ring-2 focus-visible:ring-accent ${playing ? "border-accent/60 bg-accent/10 text-accent" : "border-white/20 bg-bg-main text-text-primary"}`}>
                {narration.status === "loading" ? <Loader2 size={16} className="animate-spin" aria-hidden /> : playing ? <Square size={15} aria-hidden /> : <Play size={16} aria-hidden />}
              </button>}
            </div>
          )}
          {participation}
        </div>
        {displayImage && (
          <div className={layout.selectionArtwork}>
            {/* 그림 클릭 하나로 장면 뷰어를 연다(장면 없는 신화는 확대 뷰어) — 같은 영역에 버튼을 두 개 두지 않는다.
                「주요 장면 N」은 읽기 전용 라벨. 제목은 오른쪽 아래라 왼쪽 아래에 둔다 */}
            <button type="button" data-artwork-zoom
              aria-label={scenes.length > 0 ? `${myth.name} · ${t('keyScenes')}` : `${myth.name} · ${t("enlargeImage")}`}
              aria-haspopup="dialog" aria-expanded={scenes.length > 0 ? scenesOpen : zoom}
              onClick={() => (scenes.length > 0 ? setScenesOpen(true) : setZoom(true))}
              className={`group ${layout.overviewImage} cursor-zoom-in border border-white/10 outline-none hover:border-accent focus-visible:ring-2 focus-visible:ring-accent`}>
              <BlurDissolve key={displayImage.url} className="absolute inset-0 transition-transform duration-300 motion-safe:group-hover:scale-105">
                <MythTitleImage src={displayImage.url} alt="" priority
                  sizes="(min-width: 1280px) 565px, (min-width: 768px) 50vw, calc(100vw - 24px)"
                  onUnavailable={() => setUnavailable((urls) => [...urls, displayImage.url])} />
              </BlurDissolve>
              <FactionArtworkTitle title={myth.name} />
              {scenes.length > 0 && (
                <span className="pointer-events-none absolute bottom-3 start-3 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/55 px-3 py-1.5 text-xs font-semibold text-text-primary backdrop-blur-sm">
                  <Images size={13} className="shrink-0 text-accent" aria-hidden />{atCover ? t('coverImage') : t('keyScenes')}
                  {!atCover && <span className="tabular-nums text-accent">{sceneIndex + 1}/{scenes.length}</span>}
                </span>
              )}
            </button>
          </div>
        )}
      </div>
      {zoom && <FactionArtworkViewer images={images} title={myth.name} titleInArtwork initialIndex={artworkIndex} onIndexChange={setArtworkIndex} onClose={closeZoom} />}
      {scenesOpen && <FactionArtworkViewer images={viewerImages} title={`${myth.name} · ${t('keyScenes')}`} initialIndex={openIndex}
        onIndexChange={(index) => handleSceneIndex(Math.min(Math.max(index - viewerShift, -1), scenes.length - 1))} onClose={closeScenes} />}
      {reading && (
        <MythOverviewReading voice={voice} narration={narration} text={text}
          title={myth.name} onClose={closeReading}
          notice={<p className="mb-4 text-sm text-text-secondary">{t("mythOverviewStats", { people: memberCount, works: workCount })}</p>} />
      )}
    </>
  );
}
