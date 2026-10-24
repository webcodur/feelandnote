"use client";

import { useRef, useState } from "react";
import { ExternalLink, Pause, Play, Volume2, VolumeX } from "lucide-react";
import { useTranslations } from "next-intl";

function timestamp(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}

/** 미리듣기만 재생한다. 카드 교체 시 key가 바뀌며 이전 음원도 함께 해제된다. */
export default function MusicPreviewPlayer({ src, appleMusicUrl }: { src: string; appleMusicUrl?: string }) {
  const t = useTranslations("contentDetail.appleMusic");
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [duration, setDuration] = useState(0);
  const [failed, setFailed] = useState(false);
  const controlClass = "flex shrink-0 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";

  async function togglePlayback() {
    const audio = audioRef.current;
    if (!audio) return;
    if (!audio.paused) {
      audio.pause();
      return;
    }
    setFailed(false);
    if (audio.error) audio.load();
    if (audio.ended) audio.currentTime = 0;
    try {
      await audio.play();
    } catch {
      setFailed(true);
      setPlaying(false);
    }
  }

  return (
    <div data-music-preview className="min-w-0 rounded-xl border border-accent/20 bg-accent/[0.04] p-3 sm:p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 text-xs">
        <span className="font-semibold text-text-secondary">{t("preview")}</span>
        {appleMusicUrl && (
          <a href={appleMusicUrl} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-sm text-accent hover:text-accent-hover hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
            {t("label")}<ExternalLink size={12} aria-hidden />
          </a>
        )}
      </div>
      <div className="flex items-center gap-3">
        <button type="button" aria-label={t(playing ? "pause" : "play")} onClick={togglePlayback}
          className={`${controlClass} size-11 bg-accent text-bg-main hover:bg-accent-hover`}>
          {playing ? <Pause size={18} fill="currentColor" aria-hidden /> : <Play size={18} fill="currentColor" className="ms-0.5" aria-hidden />}
        </button>
        <div className="min-w-0 flex-1">
          <input type="range" min={0} max={duration || 1} step={0.1} value={Math.min(elapsed, duration || 1)}
            disabled={!duration} aria-label={t("seek")} aria-valuetext={`${timestamp(elapsed)} / ${timestamp(duration)}`}
            onChange={event => {
              if (!audioRef.current) return;
              const time = Number(event.target.value);
              audioRef.current.currentTime = time;
              setElapsed(time);
            }}
            className="block h-5 w-full cursor-pointer accent-accent hover:accent-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-default disabled:opacity-40" />
          <div className="mt-0.5 flex justify-between text-[11px] tabular-nums text-text-tertiary">
            <span>{timestamp(elapsed)}</span><span>{duration ? timestamp(duration) : "—:—"}</span>
          </div>
        </div>
        <button type="button" aria-label={t(muted ? "unmute" : "mute")} aria-pressed={muted}
          onClick={() => {
            if (audioRef.current) audioRef.current.muted = !muted;
          }}
          className={`${controlClass} size-9 text-text-secondary hover:bg-accent/10 hover:text-accent`}>
          {muted ? <VolumeX size={17} aria-hidden /> : <Volume2 size={17} aria-hidden />}
        </button>
      </div>
      {failed && <p role="alert" className="mt-2 text-xs text-text-secondary">{t("previewFailed")}</p>}
      <audio ref={audioRef} src={src} preload="none"
        onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)} onError={() => { setFailed(true); setPlaying(false); }}
        onVolumeChange={event => setMuted(event.currentTarget.muted)}
        onTimeUpdate={event => setElapsed(event.currentTarget.currentTime)}
        onDurationChange={event => {
          const value = event.currentTarget.duration;
          setDuration(Number.isFinite(value) && value > 0 ? value : 0);
        }} />
    </div>
  );
}
