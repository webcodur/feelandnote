"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale } from "next-intl";
import * as d3 from "d3";
import * as topojson from "topojson-client";

import { localizeCountryName } from "./countryNamesKo";

/* ── 공용 지구본 ──
   좌표 목록을 받아 회전하는 지구 위에 찍고, 원하면 순서대로 이어 경로를 그린다.
   무엇을 표시할지는 바깥이 정한다 — 이 부품은 도메인을 모른다.

   천도 게임의 WorldMapView에서 검증된 계산(정사영 투영·뒷면 판정·큰원 보간)을
   도메인 없이 추린 것이다. 게임은 아직 자체 구현을 쓴다(게임 재개 시 이관 검토). */

export interface GlobeMarker {
  id: string;
  lat: number;
  lng: number;
  label: string;
  /** 경로 순서. 주면 점 옆에 번호가 붙는다 */
  order?: number;
}

interface Props {
  markers: GlobeMarker[];
  /** 좌표를 순서대로 이어 이동 경로를 그린다 */
  showPath?: boolean;
  activeId?: string | null;
  onSelect?: (id: string) => void;
  /** 이 값이 바뀌면 해당 좌표가 정면에 오도록 돌린다 */
  focusId?: string | null;
  /** 같은 좌표를 다시 눌러도 회전시키기 위한 증가 키 */
  focusKey?: number;
  className?: string;
  label?: string;
  /** 지구본 높이 상한(px). 단독으로 크게 볼 때 올린다 */
  maxHeight?: number;
  /** 확대·축소·처음으로 버튼의 접근성 문구 */
  controlLabels?: { zoomIn: string; zoomOut: string; reset: string };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TopoData = any;

const SEA_FILL = "#07090c";
const SEA_EDGE = "rgba(212,175,55,0.22)";
const LAND_FILL = "#1c1b18";
const LAND_EDGE = "rgba(120,113,96,0.35)";
const GRATICULE = "rgba(212,175,55,0.06)";
const PATH_COLOR = "rgba(212,175,55,0.45)";
const DOT_FILL = "#8a732a";
const DOT_ACTIVE = "#f9d76e";

/* 두 극에 두는 표식 — 지구본을 아무렇게나 돌려도 위아래를 가늠할 수 있게 한다.
   북쪽은 찬 하늘빛, 남쪽은 얼음빛으로 서로 다르게 둔다. */
const POLES = [
  { lat: 90, fill: "#7fc4e8", glow: "rgba(127,196,232,0.25)" },
  { lat: -90, fill: "#d8dee6", glow: "rgba(216,222,230,0.22)" },
];

const MIN_ZOOM = 0.2;
/* 한 지역을 들여다볼 수 있을 만큼 크게 — 바다만 남을 정도까지 당겨진다 */
const MAX_ZOOM = 4;
const DEFAULT_ZOOM = 0.42;
/* 한 번 굴리거나 누를 때 곱해지는 배율. 커질수록 같은 손짓에 더 크게 움직인다.
   더하기가 아니라 곱하기라 확대된 상태에서도 체감 속도가 일정하다. */
const WHEEL_STEP = 1.18;
const BUTTON_STEP = 1.45;
const HIT_RADIUS = 16;
const DRAG_SLOP = 3;

/** 지구 반대편에 있어 보이지 않는 좌표인지 */
function isVisible(lng: number, lat: number, rotation: [number, number]): boolean {
  return d3.geoDistance([lng, lat], [-rotation[0], -rotation[1]]) < Math.PI / 2;
}

/** 좌표 무리의 한가운데(3차원 평균) — 처음 열었을 때 어디를 보여줄지 정한다 */
function centroidOf(markers: GlobeMarker[]): [number, number] {
  if (markers.length === 0) return [0, -20];
  let x = 0;
  let y = 0;
  let z = 0;
  for (const m of markers) {
    const lat = (m.lat * Math.PI) / 180;
    const lng = (m.lng * Math.PI) / 180;
    x += Math.cos(lat) * Math.cos(lng);
    y += Math.cos(lat) * Math.sin(lng);
    z += Math.sin(lat);
  }
  const n = markers.length;
  const hyp = Math.sqrt((x / n) ** 2 + (y / n) ** 2);
  const lng = (Math.atan2(y / n, x / n) * 180) / Math.PI;
  const lat = (Math.atan2(z / n, hyp) * 180) / Math.PI;
  return [-lng, -lat];
}

export default function WorldGlobe({
  markers,
  showPath = false,
  activeId = null,
  onSelect,
  focusId = null,
  focusKey = 0,
  className = "",
  label,
  maxHeight = 460,
  controlLabels,
}: Props) {
  const locale = useLocale();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const countriesRef = useRef<GeoJSON.FeatureCollection | null>(null);
  const meshRef = useRef<GeoJSON.MultiLineString | null>(null);
  const [ready, setReady] = useState(false);
  const [hoverId, setHoverId] = useState<string | null>(null);
  /* 손끝이 닿은 나라 이름 — 지도만으로는 어디가 어딘지 알 수 없어 아래 띠에 적는다 */
  const [hoverCountry, setHoverCountry] = useState<string | null>(null);

  const homeRotation = useMemo(() => centroidOf(markers), [markers]);
  const rotationRef = useRef<[number, number]>(homeRotation);
  const zoomRef = useRef(DEFAULT_ZOOM);
  const sizeRef = useRef({ w: 480, h: 380 });
  const canvasSizedRef = useRef({ w: 0, h: 0 });
  const rafRef = useRef(0);
  const draggingRef = useRef(false);
  const movedRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0, r0: 0, r1: 0 });

  const graticule = useMemo(() => d3.geoGraticule10(), []);
  const ordered = useMemo(
    () => markers.filter((m) => Number.isFinite(m.lat) && Number.isFinite(m.lng)),
    [markers],
  );

  /* 짚었거나 고른 지점의 이름 — 나라 이름보다 이쪽을 먼저 보여준다 */
  const hoverLabel = useMemo(() => {
    const id = hoverId ?? activeId;
    const found = ordered.find((m) => m.id === id);
    if (!found) return null;
    return found.order != null ? `${found.order}. ${found.label}` : found.label;
  }, [activeId, hoverId, ordered]);

  /* ── 지도 원본 로드 ── */
  useEffect(() => {
    let alive = true;
    fetch("/data/world-110m.json")
      .then((r) => r.json())
      .then((data: TopoData) => {
        if (!alive) return;
        countriesRef.current = topojson.feature(
          data,
          data.objects.countries,
        ) as unknown as GeoJSON.FeatureCollection;
        meshRef.current = topojson.mesh(
          data,
          data.objects.countries,
        ) as unknown as GeoJSON.MultiLineString;
        setReady(true);
      })
      .catch(() => {
        // 지도 원본을 못 받으면 지구본을 비워 둔다. 연표는 그대로 읽힌다.
      });
    return () => {
      alive = false;
    };
  }, []);

  /** 화면 1px을 몇 도로 볼지. 구 반지름에 맞춰야 커서를 따라 도는 느낌이 난다 */
  const degreesPerPixel = useCallback(() => {
    const { w, h } = sizeRef.current;
    const radius = Math.max(Math.min(w, h) * zoomRef.current, 1);
    /* 0.75 — 커서를 그대로 따라오게 하면 가장자리에서 손보다 앞서 나간다.
       가운데가 살짝 뒤따라오는 정도가 손으로 굴리는 감각에 가깝다.
       상한은 크게 축소했을 때 한 번에 반 바퀴씩 돌아가지 않게 하는 안전선이다. */
    return Math.min(((180 / Math.PI) / radius) * 0.75, 0.6);
  }, []);

  const projectionOf = useCallback(() => {
    const { w, h } = sizeRef.current;
    return d3
      .geoOrthographic()
      .scale(Math.min(w, h) * zoomRef.current)
      .translate([w / 2, h / 2])
      .rotate(rotationRef.current)
      .clipAngle(90);
  }, []);

  /* ── 그리기 ── */
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const countries = countriesRef.current;
    if (!canvas || !countries) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { w, h } = sizeRef.current;
    const dpr = window.devicePixelRatio || 1;
    if (canvasSizedRef.current.w !== w || canvasSizedRef.current.h !== h) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      canvasSizedRef.current = { w, h };
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const rotation = rotationRef.current;
    const projection = projectionOf();
    const path = d3.geoPath(projection, ctx);

    // 바다(구체)
    ctx.beginPath();
    path({ type: "Sphere" });
    ctx.fillStyle = SEA_FILL;
    ctx.fill();
    ctx.strokeStyle = SEA_EDGE;
    ctx.lineWidth = 1;
    ctx.stroke();

    // 경위선
    ctx.beginPath();
    path(graticule);
    ctx.strokeStyle = GRATICULE;
    ctx.lineWidth = 0.5;
    ctx.stroke();

    // 육지
    ctx.beginPath();
    for (const feat of countries.features) path(feat);
    ctx.fillStyle = LAND_FILL;
    ctx.fill();

    if (meshRef.current) {
      ctx.beginPath();
      path(meshRef.current);
      ctx.strokeStyle = LAND_EDGE;
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }

    // 두 극 표식 — 마름모 하나로 위아래를 알린다
    for (const pole of POLES) {
      if (!isVisible(0, pole.lat, rotation)) continue;
      const pt = projection([0, pole.lat]);
      if (!pt) continue;

      const r = 5;
      ctx.beginPath();
      ctx.arc(pt[0], pt[1], r + 3.5, 0, Math.PI * 2);
      ctx.fillStyle = pole.glow;
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(pt[0], pt[1] - r);
      ctx.lineTo(pt[0] + r, pt[1]);
      ctx.lineTo(pt[0], pt[1] + r);
      ctx.lineTo(pt[0] - r, pt[1]);
      ctx.closePath();
      ctx.fillStyle = pole.fill;
      ctx.fill();
      ctx.strokeStyle = "rgba(8,10,12,0.9)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // 이동 경로 — 지구 뒤로 넘어가는 구간은 끊는다
    if (showPath && ordered.length > 1) {
      ctx.strokeStyle = PATH_COLOR;
      ctx.lineWidth = 1.2;
      ctx.setLineDash([5, 4]);
      for (let i = 0; i < ordered.length - 1; i++) {
        const a = ordered[i];
        const b = ordered[i + 1];
        if (a.lat === b.lat && a.lng === b.lng) continue;
        const interp = d3.geoInterpolate([a.lng, a.lat], [b.lng, b.lat]);
        ctx.beginPath();
        let penUp = true;
        for (let t = 0; t <= 1.0001; t += 0.02) {
          const coord = interp(Math.min(t, 1));
          const pt = projection(coord);
          if (pt && isVisible(coord[0], coord[1], rotation)) {
            if (penUp) {
              ctx.moveTo(pt[0], pt[1]);
              penUp = false;
            } else {
              ctx.lineTo(pt[0], pt[1]);
            }
          } else {
            penUp = true;
          }
        }
        ctx.stroke();
      }
      ctx.setLineDash([]);
    }

    // 좌표 점 (이름은 아래 띠가 맡는다)
    for (const m of ordered) {
      if (!isVisible(m.lng, m.lat, rotation)) continue;
      const pt = projection([m.lng, m.lat]);
      if (!pt) continue;

      const isActive = m.id === activeId;
      const isHover = m.id === hoverId;
      const r = isActive ? 5.5 : isHover ? 4.5 : 3.5;

      if (isActive) {
        ctx.beginPath();
        ctx.arc(pt[0], pt[1], r + 4, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(249,215,110,0.18)";
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(pt[0], pt[1], r, 0, Math.PI * 2);
      ctx.fillStyle = isActive || isHover ? DOT_ACTIVE : DOT_FILL;
      ctx.fill();
      ctx.strokeStyle = "rgba(10,10,10,0.9)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }

  }, [activeId, graticule, hoverId, ordered, projectionOf, showPath]);

  const requestDraw = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(draw);
  }, [draw]);

  useEffect(() => {
    if (ready) requestDraw();
  }, [ready, requestDraw]);

  /* ── 크기 대응 ── */
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        sizeRef.current = { w, h: Math.max(280, Math.min(w * 0.9, maxHeight)) };
        requestDraw();
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [maxHeight, requestDraw]);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  /* ── 지정된 좌표로 돌리기 ──
     같은 지시를 두 번 수행하지 않도록 표를 끊어 둔다. 이 처리는 다시 그릴 때마다
     딸려 재실행되는데(마우스가 점 위를 스치기만 해도 그렇다), 그때마다 회전을
     되돌리면 사용자가 손으로 돌려 놓은 각도가 제자리로 튕겨 간다. */
  const doneFocusRef = useRef("");
  useEffect(() => {
    if (!focusId) return;
    const ticket = `${focusId}#${focusKey}`;
    if (doneFocusRef.current === ticket) return;
    const target = ordered.find((m) => m.id === focusId);
    if (!target) return;
    doneFocusRef.current = ticket;
    rotationRef.current = [-target.lng, -target.lat];
    requestDraw();
  }, [focusId, focusKey, ordered, requestDraw]);

  /* ── 휠 확대 ── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? WHEEL_STEP : 1 / WHEEL_STEP;
      zoomRef.current = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoomRef.current * factor));
      requestDraw();
    };
    canvas.addEventListener("wheel", handler, { passive: false });
    return () => canvas.removeEventListener("wheel", handler);
  }, [requestDraw]);

  /* ── 끌어서 회전 ── */
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    draggingRef.current = true;
    movedRef.current = false;
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      r0: rotationRef.current[0],
      r1: rotationRef.current[1],
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const hitTest = useCallback(
    (clientX: number, clientY: number): string | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const mx = clientX - rect.left;
      const my = clientY - rect.top;
      const rotation = rotationRef.current;
      const projection = projectionOf();

      let closest: string | null = null;
      let closestDist = Infinity;
      for (const m of ordered) {
        if (!isVisible(m.lng, m.lat, rotation)) continue;
        const pt = projection([m.lng, m.lat]);
        if (!pt) continue;
        const dist = Math.hypot(mx - pt[0], my - pt[1]);
        if (dist < HIT_RADIUS && dist < closestDist) {
          closest = m.id;
          closestDist = dist;
        }
      }
      return closest;
    },
    [ordered, projectionOf],
  );

  /** 커서가 짚은 자리가 어느 나라인지 — 지도 원본이 가진 이름을 그대로 쓴다 */
  const countryAt = useCallback(
    (clientX: number, clientY: number): string | null => {
      const canvas = canvasRef.current;
      const countries = countriesRef.current;
      if (!canvas || !countries) return null;
      const rect = canvas.getBoundingClientRect();
      const projection = projectionOf();
      const coord = projection.invert?.([clientX - rect.left, clientY - rect.top]);
      if (!coord || !Number.isFinite(coord[0]) || !Number.isFinite(coord[1])) return null;

      for (const feature of countries.features) {
        if (d3.geoContains(feature, coord as [number, number])) {
          const name = feature.properties?.name;
          return typeof name === "string" ? name : null;
        }
      }
      return null;
    },
    [projectionOf],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (draggingRef.current) {
        const dx = e.clientX - dragStartRef.current.x;
        const dy = e.clientY - dragStartRef.current.y;
        if (!movedRef.current && (Math.abs(dx) > DRAG_SLOP || Math.abs(dy) > DRAG_SLOP)) {
          movedRef.current = true;
        }
        /* 끄는 거리를 지구본 크기에 맞춰 각도로 바꾼다. 고정 비율로 두면
           확대하거나 지구본이 커질수록 손이 움직인 것보다 훨씬 많이 돈다 —
           같은 각도가 화면에서 더 넓은 자리를 차지하기 때문이다. */
        const degPerPx = degreesPerPixel();
        rotationRef.current = [
          dragStartRef.current.r0 + dx * degPerPx,
          Math.max(-80, Math.min(80, dragStartRef.current.r1 - dy * degPerPx)),
        ];
        requestDraw();
        return;
      }
      const hit = hitTest(e.clientX, e.clientY);
      setHoverId((prev) => (prev === hit ? prev : hit));
      const country = countryAt(e.clientX, e.clientY);
      setHoverCountry((prev) => (prev === country ? prev : country));
    },
    [countryAt, degreesPerPixel, hitTest, requestDraw],
  );

  const handlePointerUp = useCallback(() => {
    draggingRef.current = false;
  }, []);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (movedRef.current || !onSelect) return;
      const hit = hitTest(e.clientX, e.clientY);
      if (hit) onSelect(hit);
    },
    [hitTest, onSelect],
  );

  const zoomBy = useCallback(
    (factor: number) => {
      zoomRef.current = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoomRef.current * factor));
      requestDraw();
    },
    [requestDraw],
  );

  const handleReset = useCallback(() => {
    rotationRef.current = homeRotation;
    zoomRef.current = DEFAULT_ZOOM;
    requestDraw();
  }, [homeRotation, requestDraw]);

  const btnClass =
    "w-7 h-7 rounded border border-accent-dim/40 bg-bg-secondary/90 text-text-secondary hover:text-accent hover:border-accent text-sm font-bold flex items-center justify-center cursor-pointer";

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden rounded border border-accent-dim/30 bg-bg-secondary select-none ${className}`}
    >
      <div className="absolute top-2 right-2 z-10 flex flex-col gap-1">
        <button type="button" onClick={() => zoomBy(BUTTON_STEP)} className={btnClass} aria-label={controlLabels?.zoomIn}>
          +
        </button>
        <button type="button" onClick={() => zoomBy(1 / BUTTON_STEP)} className={btnClass} aria-label={controlLabels?.zoomOut}>
          −
        </button>
        <button type="button" onClick={handleReset} className={`${btnClass} text-[10px]`} aria-label={controlLabels?.reset}>
          ↺
        </button>
      </div>

      <canvas
        ref={canvasRef}
        role="img"
        aria-label={label}
        /* touchAction none — 손가락으로 끌 때 브라우저가 그 동작을 페이지 스크롤로
           가져가 버리면 지구본이 돌지 않는다. 회전은 이 그림판이 직접 맡는다. */
        style={{
          display: "block",
          width: "100%",
          touchAction: "none",
          cursor: onSelect && hoverId ? "pointer" : "grab",
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={() => {
          handlePointerUp();
          setHoverId(null);
          setHoverCountry(null);
        }}
        onClick={handleClick}
      />

      {/* 가운데 아래 띠 — 짚은 곳의 이름을 적는다. 자리는 늘 잡아 두어 글이 뜰 때
          지구본이 흔들리지 않게 한다. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex h-8 items-center justify-center px-2">
        {(hoverLabel || hoverCountry) && (
          <span className="max-w-full truncate rounded bg-black/70 px-2.5 py-1 text-xs text-text-primary backdrop-blur-sm">
            {hoverLabel ?? localizeCountryName(hoverCountry as string, locale)}
          </span>
        )}
      </div>
    </div>
  );
}
