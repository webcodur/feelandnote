/*
  파일명: /components/features/scriptures/academy/SheetMusic.tsx
  기능: abcjs 래퍼 컴포넌트
  책임: ABC 표기법 문자열을 악보(SVG)로 렌더하고, 선택적으로 MIDI 재생을 지원한다.
*/ // ------------------------------

"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { Play, Square, Loader2 } from "lucide-react";

interface SheetMusicProps {
  abc: string;
  playable?: boolean;
}

export default function SheetMusic({ abc, playable = false }: SheetMusicProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const synthRef = useRef<any>(null);
  const timerRef = useRef<any>(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [abcjsMod, setAbcjsMod] = useState<any>(null);

  useEffect(() => {
    let cancelled = false;
    import("abcjs").then((mod) => {
      if (!cancelled) setAbcjsMod(mod.default ?? mod);
    });
    return () => { cancelled = true; };
  }, []);

  const NOTE_COLOR = "rgba(255,255,255,0.88)";
  const STAFF_COLOR = "rgba(255,255,255,0.18)";
  const TEXT_COLOR = "rgba(255,255,255,0.55)";

  const isStaffOrBar = (el: Element): boolean => {
    const cls = el.getAttribute("class") ?? "";
    const parentCls = el.parentElement?.getAttribute("class") ?? "";
    return /abcjs-(staff|bar|brace|top-line|ledger)/.test(cls + " " + parentCls);
  };

  const patchSvgColors = useCallback((container: HTMLElement) => {
    const svg = container.querySelector("svg");
    if (!svg) return;
    svg.style.width = "100%";
    svg.style.height = "auto";

    svg.querySelectorAll("path").forEach((el) => {
      const color = isStaffOrBar(el) ? STAFF_COLOR : NOTE_COLOR;
      el.setAttribute("fill", color);
      el.setAttribute("stroke", color);
    });
    svg.querySelectorAll("line").forEach((el) => {
      el.setAttribute("stroke", isStaffOrBar(el) ? STAFF_COLOR : NOTE_COLOR);
    });
    svg.querySelectorAll("text").forEach((el) => {
      el.setAttribute("fill", TEXT_COLOR);
    });
    svg.querySelectorAll("rect").forEach((el) => {
      el.setAttribute("fill", isStaffOrBar(el) ? STAFF_COLOR : NOTE_COLOR);
    });
    svg.querySelectorAll("circle, ellipse, polygon").forEach((el) => {
      el.setAttribute("fill", NOTE_COLOR);
    });
  }, []);

  useEffect(() => {
    if (!abcjsMod || !containerRef.current) return;
    abcjsMod.renderAbc(containerRef.current, abc, {
      responsive: "resize",
      staffwidth: 600,
      paddingtop: 0,
      paddingbottom: 0,
      add_classes: true,
    });
    patchSvgColors(containerRef.current);
  }, [abcjsMod, abc, patchSvgColors]);

  useEffect(() => {
    return () => {
      synthRef.current?.stop();
      timerRef.current?.stop();
    };
  }, []);

  const handlePlay = useCallback(async () => {
    if (!abcjsMod || !containerRef.current) return;

    if (playing) {
      synthRef.current?.stop();
      timerRef.current?.stop();
      setPlaying(false);
      return;
    }

    setLoading(true);
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

      const synth = new abcjsMod.synth.CreateSynth();
      synthRef.current = synth;

      const visualObj = abcjsMod.renderAbc(containerRef.current, abc, {
        responsive: "resize",
        staffwidth: 600,
        add_classes: true,
      });
      patchSvgColors(containerRef.current);

      await synth.init({
        audioContext,
        visualObj: visualObj[0],
      });
      await synth.prime();

      const timer = new abcjsMod.TimingCallbacks(visualObj[0], {
        eventCallback: () => {},
      });
      timerRef.current = timer;

      synth.start();
      timer.start();
      setPlaying(true);

      const duration = synth.totalDuration ?? synth.duration ?? 10;
      setTimeout(() => {
        setPlaying(false);
      }, duration * 1000 + 500);
    } catch {
      // synth 지원 안 되는 환경 대비
    } finally {
      setLoading(false);
    }
  }, [abcjsMod, abc, playing]);

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className="w-full overflow-x-auto rounded-lg bg-white/[0.03] p-3 sm:p-4"
      />

      {playable && abcjsMod && (
        <button
          onClick={handlePlay}
          disabled={loading}
          className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium
            bg-[#d4af37]/10 border border-[#d4af37]/20 text-[#d4af37]/80
            hover:bg-[#d4af37]/15 hover:text-[#d4af37] transition-all duration-200
            disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : playing ? (
            <Square className="w-3.5 h-3.5" />
          ) : (
            <Play className="w-3.5 h-3.5" />
          )}
          {loading ? "Loading..." : playing ? "Stop" : "Play"}
        </button>
      )}
    </div>
  );
}
