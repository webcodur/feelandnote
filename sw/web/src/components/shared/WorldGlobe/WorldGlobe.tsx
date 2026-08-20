"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useLocale } from "next-intl";
import { Maximize2 } from "lucide-react";
import * as d3 from "d3";
import * as topojson from "topojson-client";

import { localizeCountryName } from "./countryNamesKo";
import { globeFrameStyle } from "./globeLayout";
import {
  PULSE_MS,
  canStartFocusAnimation,
  hasInterruptedFocusTicket,
  isNearRotation,
  pulseProgress,
  pulseRing,
  rotationAt,
  spinDurationMs,
  type MarkerPulse,
} from "./globeSpin";

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
  /** 위치를 모르는 사건을 골랐을 때 가운데 ?를 다시 띄운다 */
  unknownKey?: number;
  className?: string;
  label?: string;
  /** 지구본 높이 상한(px). 단독으로 크게 볼 때 올린다 */
  maxHeight?: number;
  /** 확대·축소·처음으로 버튼의 접근성 문구 */
  controlLabels?: { zoomIn: string; zoomOut: string; reset: string };
  /** 지도 기준 시점을 알리는 짧은 문구 (예: "현대 국경") */
  mapNote?: string;
  /** 한 국가에 포함된 좌표 수를 화면 언어로 적는다 */
  formatMarkerCount?: (count: number) => string;
  /** 컨테이너의 세로 공간을 전부 쓰는 전체화면 모드 */
  fillContainer?: boolean;
  /** Initial zoom. Fullscreen views can use a larger home framing. */
  initialZoom?: number;
  /** 전체화면 진입 버튼. 콜백이 있을 때만 우하단에 표시한다 */
  onExpand?: () => void;
  expandLabel?: string;
  expandAriaLabel?: string;
  /** 인라인 배치에서 세로 휠·터치를 바깥 페이지 스크롤에 양보한다 */
  allowPageScroll?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TopoData = any;

interface MapLayers {
  land: GeoJSON.FeatureCollection;
  coast: GeoJSON.MultiLineString;
  borders: GeoJSON.MultiLineString;
  countriesByName: Map<string, GeoJSON.Feature>;
  countryLabels: {
    name: string;
    anchor: [number, number];
    area: number;
  }[];
  countryHitRegions: {
    feature: GeoJSON.Feature;
    name: string;
    bounds: [[number, number], [number, number]];
  }[];
}

interface FastMesh {
  /** 각 점을 단위 구면의 x/y/z로 미리 바꾼 선 묶음 */
  lines: Float32Array[];
}

const SEA_EDGE = "rgba(212,175,55,0.26)";
const COAST_EDGE = "rgba(207,194,154,0.48)";
const BORDER_EDGE = "rgba(166,156,128,0.2)";
const VISITED_COUNTRY_FILL = "rgba(212,175,55,0.085)";
const VISITED_COUNTRY_EDGE = "rgba(212,175,55,0.38)";
const COUNTRY_HOVER_FILL = "rgba(212,175,55,0.16)";
const VISITED_COUNTRY_HOVER_FILL = "rgba(212,175,55,0.24)";
const COUNTRY_HOVER_EDGE = "rgba(249,215,110,0.72)";
const COUNTRY_LABEL_FILL = "rgba(224,219,199,0.42)";
const VISITED_COUNTRY_LABEL_FILL = "rgba(249,215,110,0.82)";
const COUNTRY_LABEL_HALO = "rgba(4,7,10,0.78)";
const GRATICULE = "rgba(212,175,55,0.075)";
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
const MAX_ZOOM = 8;
const DEFAULT_ZOOM = 0.42;
/* 한 번 굴리거나 누를 때 곱해지는 배율. 커질수록 같은 손짓에 더 크게 움직인다.
   더하기가 아니라 곱하기라 확대된 상태에서도 체감 속도가 일정하다. */
const WHEEL_STEP = 1.18;
const BUTTON_STEP = 1.45;
const HIT_RADIUS = 16;
const DRAG_SLOP = 3;
/* 전 지구가 보일 때 110m은 충분하다. 지역을 들여다볼 때만 50m을 늦게 받아
   첫 화면 비용을 지키고, 해안선·섬·국경의 각진 부분을 줄인다. */
const HIGH_DETAIL_PREFETCH_ZOOM = 0.8;
const HIGH_DETAIL_RENDER_ZOOM = 0.95;

/** Natural Earth TopoJSON을 그리기용 네 겹으로 나눈다. */
function mapLayersOf(data: TopoData, buildHitRegions = false): MapLayers {
  const countriesObject = data.objects.countries;
  const landObject = data.objects.land;
  const countries = topojson.feature(
    data,
    countriesObject,
  ) as unknown as GeoJSON.FeatureCollection;
  const land = topojson.feature(
    data,
    landObject,
  ) as unknown as GeoJSON.FeatureCollection;
  const coast = topojson.mesh(
    data,
    landObject,
  ) as unknown as GeoJSON.MultiLineString;
  /* a !== b인 공유 호만 남겨 해안선과 현대 국경을 같은 선으로 칠하지 않는다. */
  const borders = topojson.mesh(
    data,
    countriesObject,
    (a, b) => a !== b,
  ) as unknown as GeoJSON.MultiLineString;
  const countriesByName = new Map<string, GeoJSON.Feature>();
  const countryLabels: MapLayers["countryLabels"] = [];
  const countryHitRegions: MapLayers["countryHitRegions"] = [];

  for (const feature of countries.features) {
    const name = feature.properties?.name;
    if (typeof name !== "string") continue;
    countriesByName.set(name, feature);
    countryLabels.push({
      name,
      anchor: d3.geoCentroid(feature),
      area: d3.geoArea(feature),
    });
    if (buildHitRegions) {
      countryHitRegions.push({
        feature,
        name,
        bounds: d3.geoBounds(feature),
      });
    }
  }
  countryLabels.sort((a, b) => b.area - a.area);

  return {
    land,
    coast,
    borders,
    countriesByName,
    countryLabels,
    countryHitRegions,
  };
}

/** 드래그 때 D3 투영·GeoJSON 순회를 되풀이하지 않도록 선 좌표를 3D 벡터로 바꿔 둔다. */
function fastMeshOf(mesh: GeoJSON.MultiLineString): FastMesh {
  return {
    lines: mesh.coordinates.map((line) => {
      const vectors = new Float32Array(line.length * 3);
      for (let i = 0; i < line.length; i += 1) {
        const [lng, lat] = line[i];
        const lambda = (lng * Math.PI) / 180;
        const phi = (lat * Math.PI) / 180;
        const cosPhi = Math.cos(phi);
        const at = i * 3;
        vectors[at] = cosPhi * Math.cos(lambda);
        vectors[at + 1] = cosPhi * Math.sin(lambda);
        vectors[at + 2] = Math.sin(phi);
      }
      return vectors;
    }),
  };
}

/**
 * 미리 계산한 3D 선을 현재 정사영 회전에 맞춰 직접 그린다.
 * 지평선과 교차하는 짧은 구간은 깊이값으로 잘라, 뒷면의 선이 앞면으로 새지 않게 한다.
 */
function traceFastMesh(
  ctx: CanvasRenderingContext2D,
  mesh: FastMesh,
  rotation: [number, number],
  scale: number,
  centerX: number,
  centerY: number,
) {
  const centerLng = (-rotation[0] * Math.PI) / 180;
  const centerLat = (-rotation[1] * Math.PI) / 180;
  const sinLng = Math.sin(centerLng);
  const cosLng = Math.cos(centerLng);
  const sinLat = Math.sin(centerLat);
  const cosLat = Math.cos(centerLat);

  for (const line of mesh.lines) {
    let previousX = 0;
    let previousY = 0;
    let previousDepth = -1;

    for (let i = 0; i < line.length; i += 3) {
      const sphereX = line[i];
      const sphereY = line[i + 1];
      const sphereZ = line[i + 2];
      const horizontal = -sinLng * sphereX + cosLng * sphereY;
      const vertical =
        -sinLat * cosLng * sphereX -
        sinLat * sinLng * sphereY +
        cosLat * sphereZ;
      const depth =
        cosLat * cosLng * sphereX +
        cosLat * sinLng * sphereY +
        sinLat * sphereZ;
      const x = centerX + horizontal * scale;
      const y = centerY - vertical * scale;

      if (i === 0) {
        if (depth >= 0) ctx.moveTo(x, y);
      } else if (depth >= 0 && previousDepth >= 0) {
        ctx.lineTo(x, y);
      } else if (depth >= 0 || previousDepth >= 0) {
        const amount = previousDepth / (previousDepth - depth);
        const edgeX = previousX + (x - previousX) * amount;
        const edgeY = previousY + (y - previousY) * amount;
        if (previousDepth >= 0) {
          ctx.lineTo(edgeX, edgeY);
        } else {
          ctx.moveTo(edgeX, edgeY);
          ctx.lineTo(x, y);
        }
      }

      previousX = x;
      previousY = y;
      previousDepth = depth;
    }
  }
}

/** 날짜변경선을 가로지르는 영역까지 포함하는 경도 범위 판정 */
function longitudeInBounds(lng: number, west: number, east: number): boolean {
  return west <= east ? lng >= west && lng <= east : lng >= west || lng <= east;
}

/** 위·경도 한 점이 속한 현대 국가. hover와 행적 국가 집계가 같은 판정을 쓴다. */
function countryNameAtCoordinate(
  map: MapLayers,
  lng: number,
  lat: number,
): string | null {
  for (const region of map.countryHitRegions) {
    const [[west, south], [east, north]] = region.bounds;
    if (lat < south || lat > north || !longitudeInBounds(lng, west, east)) continue;
    if (d3.geoContains(region.feature, [lng, lat])) return region.name;
  }
  return null;
}

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
  unknownKey = 0,
  className = "",
  label,
  maxHeight = 460,
  controlLabels,
  mapNote,
  formatMarkerCount,
  fillContainer = false,
  initialZoom = DEFAULT_ZOOM,
  onExpand,
  expandLabel,
  expandAriaLabel,
  allowPageScroll = false,
}: Props) {
  const locale = useLocale();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const backgroundCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const backgroundSnapshotRef = useRef<{
    w: number;
    h: number;
    zoom: number;
    rotation: [number, number];
  } | null>(null);
  const backgroundDirtyRef = useRef(true);
  const baseMapRef = useRef<MapLayers | null>(null);
  const detailedMapRef = useRef<MapLayers | null>(null);
  const baseFastMeshesRef = useRef<{
    coast: FastMesh;
    borders: FastMesh;
  } | null>(null);
  const detailedFastMeshesRef = useRef<{
    coast: FastMesh;
    borders: FastMesh;
  } | null>(null);
  const detailedMapPromiseRef = useRef<Promise<void> | null>(null);
  const [ready, setReady] = useState(false);
  const [detailedReady, setDetailedReady] = useState(false);
  const [isViewportVisible, setIsViewportVisible] = useState(false);
  const [hoverId, setHoverId] = useState<string | null>(null);
  /* 손끝이 닿은 나라 이름 — 지도만으로는 어디가 어딘지 알 수 없어 아래 띠에 적는다 */
  const [hoverCountry, setHoverCountry] = useState<string | null>(null);
  const [unknownMark, setUnknownMark] = useState(0);
  const hoverIdRef = useRef<string | null>(null);
  const hoverCountryRef = useRef<string | null>(null);

  const homeRotation = useMemo(() => centroidOf(markers), [markers]);
  const homeZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, initialZoom));
  const rotationRef = useRef<[number, number]>(homeRotation);
  const zoomRef = useRef(homeZoom);
  const sizeRef = useRef({ w: 480, h: 380 });
  const labelWidthCacheRef = useRef(new Map<string, number>());
  const rafRef = useRef(0);
  const hoverRafRef = useRef(0);
  const spinRafRef = useRef(0);
  const spinningRef = useRef(false);
  const pulseRafRef = useRef(0);
  const pulseRef = useRef<MarkerPulse | null>(null);
  const mountedRef = useRef(true);
  const viewportVisibleRef = useRef(false);
  const reducedMotionRef = useRef(false);
  const doneFocusRef = useRef("");
  const activeFocusAnimationRef = useRef<string | null>(null);
  const draggingRef = useRef(false);
  const wheelActiveRef = useRef(false);
  const wheelIdleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingHoverRef = useRef<{ x: number; y: number } | null>(null);
  const movedRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0, r0: 0, r1: 0 });

  const graticule = useMemo(() => d3.geoGraticule10(), []);
  const ordered = useMemo(
    () => markers.filter((m) => Number.isFinite(m.lat) && Number.isFinite(m.lng)),
    [markers],
  );

  /* 정확한 행적 점을 짚으면 국가명 아래에 장소·사건명을 함께 보여준다. */
  const hoverLabel = useMemo(() => {
    const found = ordered.find((m) => m.id === hoverId);
    if (!found) return null;
    return found.order != null ? `${found.order}. ${found.label}` : found.label;
  }, [hoverId, ordered]);

  /* 행적 좌표를 현대 국가에 대응해 평소에도 해당 국토를 옅게 강조한다. */
  const visitedRegions = useMemo(() => {
    const counts = new Map<string, number>();
    const byMarkerId = new Map<string, string>();
    const map = detailedReady
      ? detailedMapRef.current ?? baseMapRef.current
      : baseMapRef.current;
    if (!ready || !map) return { counts, byMarkerId };

    for (const marker of ordered) {
      const country = countryNameAtCoordinate(map, marker.lng, marker.lat);
      if (!country) continue;
      byMarkerId.set(marker.id, country);
      counts.set(country, (counts.get(country) ?? 0) + 1);
    }
    return { counts, byMarkerId };
  }, [detailedReady, ordered, ready]);

  const tooltipCountry = hoverId
    ? visitedRegions.byMarkerId.get(hoverId) ?? hoverCountry
    : hoverCountry;
  const tooltipMarkerCount = tooltipCountry
    ? visitedRegions.counts.get(tooltipCountry) ?? 0
    : 0;

  /* ── 지도 원본 로드 ── */
  useEffect(() => {
    let alive = true;
    fetch("/data/world-110m.json")
      .then((r) => r.json())
      .then((data: TopoData) => {
        if (!alive) return;
        const layers = mapLayersOf(data, true);
        baseMapRef.current = layers;
        baseFastMeshesRef.current = {
          coast: fastMeshOf(layers.coast),
          borders: fastMeshOf(layers.borders),
        };
        backgroundDirtyRef.current = true;
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
    if (!viewportVisibleRef.current) return;
    const canvas = canvasRef.current;
    const baseMap = baseMapRef.current;
    if (!canvas || !baseMap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { w, h } = sizeRef.current;
    const zoom = zoomRef.current;
    const detailedMap =
      zoom >= HIGH_DETAIL_RENDER_ZOOM ? detailedMapRef.current : null;
    const interacting = draggingRef.current || spinningRef.current;
    const spinning = spinningRef.current;
    const fastMeshes = interacting
      ? detailedMap && detailedFastMeshesRef.current
        ? detailedFastMeshesRef.current
        : baseFastMeshesRef.current
      : null;
    const layers = detailedMap && !fastMeshes ? detailedMap : baseMap;
    const labelLayers = detailedMap ?? baseMap;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const physicalWidth = Math.max(1, Math.round(w * dpr));
    const physicalHeight = Math.max(1, Math.round(h * dpr));
    if (canvas.width !== physicalWidth || canvas.height !== physicalHeight) {
      canvas.width = physicalWidth;
      canvas.height = physicalHeight;
      backgroundDirtyRef.current = true;
    }
    if (!backgroundCanvasRef.current) {
      backgroundCanvasRef.current = document.createElement("canvas");
      backgroundDirtyRef.current = true;
    }
    const backgroundCanvas = backgroundCanvasRef.current;
    if (
      backgroundCanvas.width !== physicalWidth ||
      backgroundCanvas.height !== physicalHeight
    ) {
      backgroundCanvas.width = physicalWidth;
      backgroundCanvas.height = physicalHeight;
      backgroundSnapshotRef.current = null;
      backgroundDirtyRef.current = true;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const rotation = rotationRef.current;
    const projection = projectionOf();
    const path = d3.geoPath(projection, ctx);
    const radius = Math.max(Math.min(w, h) * zoom, 1);
    const interactionActive =
      draggingRef.current || wheelActiveRef.current || spinningRef.current;
    const backgroundSnapshot = backgroundSnapshotRef.current;
    const canScaleBackgroundDuringWheel =
      wheelActiveRef.current &&
      backgroundSnapshot !== null &&
      backgroundSnapshot.w === w &&
      backgroundSnapshot.h === h &&
      Math.abs(backgroundSnapshot.rotation[0] - rotation[0]) < 0.001 &&
      Math.abs(backgroundSnapshot.rotation[1] - rotation[1]) < 0.001;

    if (canScaleBackgroundDuringWheel) {
      const scale = zoom / backgroundSnapshot.zoom;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, physicalWidth, physicalHeight);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.scale(scale, scale);
      ctx.translate(-w / 2, -h / 2);
      ctx.drawImage(backgroundCanvas, 0, 0, w, h);
      ctx.restore();
    } else if (backgroundDirtyRef.current) {
      ctx.clearRect(0, 0, w, h);

    // 바다 — 평면 한 색 대신 구체의 중심과 가장자리에 깊이 차를 둔다
    ctx.beginPath();
    path({ type: "Sphere" });
    const seaGradient = ctx.createRadialGradient(
      w * 0.42,
      h * 0.36,
      radius * 0.06,
      w / 2,
      h / 2,
      radius,
    );
    seaGradient.addColorStop(0, "#132028");
    seaGradient.addColorStop(0.58, "#0a1117");
    seaGradient.addColorStop(1, "#04070a");
    ctx.fillStyle = seaGradient;
    ctx.fill();
    ctx.strokeStyle = SEA_EDGE;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.beginPath();
    path(layers.land);
    const landGradient = ctx.createLinearGradient(w * 0.2, h * 0.15, w * 0.82, h * 0.9);
    landGradient.addColorStop(0, "#353328");
    landGradient.addColorStop(0.48, "#25261f");
    landGradient.addColorStop(1, "#151917");
    ctx.fillStyle = landGradient;
    ctx.fill();

    if (visitedRegions.counts.size > 0) {
      ctx.beginPath();
      for (const country of visitedRegions.counts.keys()) {
        const feature = layers.countriesByName.get(country);
        if (feature) path(feature);
      }
      ctx.fillStyle = VISITED_COUNTRY_FILL;
      ctx.fill();
      ctx.strokeStyle = VISITED_COUNTRY_EDGE;
      ctx.lineWidth = 0.7;
      ctx.stroke();
    }

    if (fastMeshes) {
      ctx.beginPath();
      traceFastMesh(ctx, fastMeshes.coast, rotation, radius, w / 2, h / 2);
      ctx.strokeStyle = COAST_EDGE;
      ctx.lineWidth = 0.85;
      ctx.stroke();

      ctx.beginPath();
      traceFastMesh(ctx, fastMeshes.borders, rotation, radius, w / 2, h / 2);
      ctx.strokeStyle = BORDER_EDGE;
      ctx.lineWidth = 0.45;
      ctx.stroke();
    } else {
      ctx.beginPath();
      path(layers.coast);
      ctx.strokeStyle = COAST_EDGE;
      ctx.lineWidth = zoom >= HIGH_DETAIL_RENDER_ZOOM ? 0.85 : 0.7;
      ctx.stroke();

      ctx.beginPath();
      path(layers.borders);
      ctx.strokeStyle = BORDER_EDGE;
      ctx.lineWidth = 0.45;
      ctx.stroke();
    }

    ctx.beginPath();
    path(graticule);
    ctx.strokeStyle = GRATICULE;
    ctx.lineWidth = 0.45;
    ctx.stroke();

    const minLabelArea =
        zoom < 0.65
          ? 0.006
          : zoom < 0.95
            ? 0.002
            : zoom < 1.5
              ? 0.0003
              : zoom < 2.4
                ? 0.00003
                : 0;
      const labelLimit = zoom < 0.65 ? 36 : zoom < 1.5 ? 60 : 100;
      const labelFontSize =
        (zoom >= 1.5 ? 10 : zoom >= 0.8 ? 9 : 8) + (fillContainer ? 2 : 0);
      const occupiedLabels: {
        left: number;
        right: number;
        top: number;
        bottom: number;
      }[] = [];
      const labelCandidates = labelLayers.countryLabels.toSorted((a, b) => {
        const aVisited = visitedRegions.counts.has(a.name) ? 1 : 0;
        const bVisited = visitedRegions.counts.has(b.name) ? 1 : 0;
        return bVisited - aVisited || b.area - a.area;
      });
      let placedLabels = 0;

      ctx.save();
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.lineJoin = "round";
      for (const candidate of labelCandidates) {
        const isVisited = visitedRegions.counts.has(candidate.name);
        if (!isVisited && candidate.area < minLabelArea) continue;
        if (!isVisible(candidate.anchor[0], candidate.anchor[1], rotation))
          continue;
        const pt = projection(candidate.anchor);
        if (!pt) continue;

        const fontWeight = isVisited ? 650 : 500;
        const font = `${fontWeight} ${labelFontSize}px ui-monospace, SFMono-Regular, Menlo, monospace`;
        const text = localizeCountryName(candidate.name, locale);
        const widthCacheKey = `${font}|${text}`;
        ctx.font = font;
        let textWidth = labelWidthCacheRef.current.get(widthCacheKey);
        if (textWidth == null) {
          textWidth = ctx.measureText(text).width;
          labelWidthCacheRef.current.set(widthCacheKey, textWidth);
        }
        const halfWidth = textWidth / 2 + 3;
        const halfHeight = labelFontSize / 2 + 2;
        if (
          Math.hypot(pt[0] - w / 2, pt[1] - h / 2) +
            Math.hypot(halfWidth, halfHeight) >
          radius - 2
        ) {
          continue;
        }
        const box = {
          left: pt[0] - halfWidth,
          right: pt[0] + halfWidth,
          top: pt[1] - halfHeight,
          bottom: pt[1] + halfHeight,
        };
        const overlaps = occupiedLabels.some(
          (other) =>
            box.left < other.right &&
            box.right > other.left &&
            box.top < other.bottom &&
            box.bottom > other.top,
        );
        if (overlaps) continue;

        occupiedLabels.push(box);
        ctx.strokeStyle = COUNTRY_LABEL_HALO;
        ctx.lineWidth = isVisited ? 2.6 : 2.2;
        ctx.strokeText(text, pt[0], pt[1]);
        ctx.fillStyle = isVisited
          ? VISITED_COUNTRY_LABEL_FILL
          : COUNTRY_LABEL_FILL;
        ctx.fillText(text, pt[0], pt[1]);
        placedLabels += 1;
        if (placedLabels >= labelLimit) break;
      }
    ctx.restore();

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

    if (showPath && ordered.length > 1) {
      const pathStep = spinning ? 0.08 : 0.02;
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
        for (let t = 0; t <= 1.0001; t += pathStep) {
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

      const backgroundCtx = backgroundCanvas.getContext("2d");
      if (backgroundCtx && !interactionActive) {
        backgroundCtx.setTransform(1, 0, 0, 1, 0, 0);
        backgroundCtx.clearRect(0, 0, physicalWidth, physicalHeight);
        backgroundCtx.drawImage(canvas, 0, 0);
        backgroundSnapshotRef.current = {
          w,
          h,
          zoom,
          rotation: [...rotation],
        };
        backgroundDirtyRef.current = false;
      }
    } else {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, physicalWidth, physicalHeight);
      ctx.drawImage(backgroundCanvas, 0, 0);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    // hover는 캐시된 지도 위에 해당 국가 하나만 즉시 덧그린다
    const hoveredCountry = hoverCountryRef.current;
    const hoveredCountryFeature = hoveredCountry
      ? baseMap.countriesByName.get(hoveredCountry) ??
        layers.countriesByName.get(hoveredCountry)
      : null;
    if (hoveredCountryFeature) {
      ctx.beginPath();
      path(hoveredCountryFeature);
      const isVisitedCountry = visitedRegions.counts.has(hoveredCountry as string);
      ctx.fillStyle = isVisitedCountry
        ? VISITED_COUNTRY_HOVER_FILL
        : COUNTRY_HOVER_FILL;
      ctx.fill();
      ctx.strokeStyle = COUNTRY_HOVER_EDGE;
      ctx.lineWidth = isVisitedCountry ? 1.25 : 0.9;
      ctx.stroke();
    }

    // 행적 좌표는 일반 지도 정보보다 한 단계 강한 금색 점과 후광으로 구분한다
    const pulse = pulseRef.current;
    const pulseT = pulse ? pulseProgress(pulse, performance.now()) : null;
    if (pulse && pulseT == null) pulseRef.current = null;
    const pulseTarget = pulse ? ordered.find((m) => m.id === pulse.id) : null;
    const globeScale = fillContainer ? 1.15 : 1;
    const hoverId = hoverIdRef.current;
    const stacked = [...ordered].sort((a, b) => {
      const rank = (marker: (typeof ordered)[number]) =>
        marker.id === activeId ? 2 : marker.id === hoverId ? 1 : 0;
      return rank(a) - rank(b);
    });
    for (const m of stacked) {
      if (!isVisible(m.lng, m.lat, rotation)) continue;
      const pt = projection([m.lng, m.lat]);
      if (!pt) continue;

      const isActive = m.id === activeId;
      const isHover = m.id === hoverIdRef.current;
      const isPulse = pulseT != null && pulseTarget != null &&
        m.lat === pulseTarget.lat &&
        m.lng === pulseTarget.lng;
      const r = (isActive ? 6.25 : isHover ? 5.5 : 4) * globeScale;

      ctx.beginPath();
      ctx.arc(pt[0], pt[1], r + (isActive || isHover || isPulse ? 4.5 : 3), 0, Math.PI * 2);
      ctx.fillStyle =
        isActive || isHover || isPulse
          ? "rgba(249,215,110,0.22)"
          : "rgba(212,175,55,0.11)";
      ctx.fill();

      ctx.beginPath();
      ctx.arc(pt[0], pt[1], r, 0, Math.PI * 2);
      ctx.fillStyle = isActive || isHover || isPulse ? DOT_ACTIVE : DOT_FILL;
      ctx.fill();
      ctx.strokeStyle = "rgba(10,10,10,0.9)";
      ctx.lineWidth = isActive || isHover || isPulse ? 1.4 : 1;
      ctx.stroke();
    }

    // 같은 좌표에 점이 여러 개여도 파동은 모든 점 위에 한 번만 그린다
    if (pulse && pulseT != null && pulseTarget && isVisible(pulseTarget.lng, pulseTarget.lat, rotation)) {
      const pt = projection([pulseTarget.lng, pulseTarget.lat]);
      if (pt) {
        for (const lag of [0, 0.32]) {
          const wave = pulseRing(pulseT, lag);
          if (!wave) continue;
          ctx.beginPath();
          ctx.arc(pt[0], pt[1], wave.radius * globeScale, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(249,215,110,${wave.alpha})`;
          ctx.lineWidth = wave.width;
          ctx.stroke();
        }
      }
    }

  }, [
    activeId,
    fillContainer,
    graticule,
    locale,
    ordered,
    projectionOf,
    showPath,
    visitedRegions,
  ]);

  const drawRef = useRef(draw);
  drawRef.current = draw;

  const requestDraw = useCallback(() => {
    if (!viewportVisibleRef.current) return;
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => drawRef.current());
  }, []);

  /** 확대 의도가 생겼을 때만 50m 지도를 별도 청크로 받는다. */
  const ensureDetailedMap = useCallback(() => {
    if (detailedMapRef.current || detailedMapPromiseRef.current) return;

    detailedMapPromiseRef.current = import("world-atlas/countries-50m.json")
      .then((module) => {
        const detailedMap = mapLayersOf(module.default as TopoData, true);
        detailedMapRef.current = detailedMap;
        detailedFastMeshesRef.current = {
          coast: fastMeshOf(detailedMap.coast),
          borders: fastMeshOf(detailedMap.borders),
        };
        if (mountedRef.current) {
          backgroundDirtyRef.current = true;
          setDetailedReady(true);
          requestDraw();
        }
      })
      .catch(() => {
        // 정밀 지도를 못 받아도 110m 기본 지도와 모든 행적 기능은 그대로 동작한다.
        detailedMapPromiseRef.current = null;
      });
  }, [requestDraw]);

  useEffect(() => {
    backgroundDirtyRef.current = true;
  }, [locale, visitedRegions]);

  useEffect(() => {
    if (ready && isViewportVisible) requestDraw();
  }, [isViewportVisible, ready, requestDraw]);

  const scheduleZoomSettle = useCallback(() => {
    wheelActiveRef.current = true;
    if (wheelIdleTimerRef.current) clearTimeout(wheelIdleTimerRef.current);
    wheelIdleTimerRef.current = setTimeout(() => {
      wheelActiveRef.current = false;
      backgroundDirtyRef.current = true;
      requestDraw();
    }, 140);
  }, [requestDraw]);

  /* ── 크기 대응 ── */
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        const h = entry.contentRect.height;
        if (w <= 0 || h <= 0) continue;
        sizeRef.current = { w, h };
        backgroundDirtyRef.current = true;
        requestDraw();
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [fillContainer, maxHeight, requestDraw]);

  useEffect(
    () => {
      mountedRef.current = true;
      return () => {
        mountedRef.current = false;
        cancelAnimationFrame(rafRef.current);
        cancelAnimationFrame(hoverRafRef.current);
        cancelAnimationFrame(spinRafRef.current);
        cancelAnimationFrame(pulseRafRef.current);
        spinningRef.current = false;
        pulseRef.current = null;
        if (wheelIdleTimerRef.current) clearTimeout(wheelIdleTimerRef.current);
      };
    },
    [],
  );

  const cancelSpin = useCallback(() => {
    cancelAnimationFrame(spinRafRef.current);
    spinRafRef.current = 0;
    spinningRef.current = false;
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      reducedMotionRef.current = media.matches;
    };
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  const cancelPulse = useCallback(() => {
    cancelAnimationFrame(pulseRafRef.current);
    pulseRafRef.current = 0;
    pulseRef.current = null;
  }, []);

  const releaseInterruptedFocusTicket = useCallback(() => {
    if (
      !hasInterruptedFocusTicket(
        viewportVisibleRef.current,
        activeFocusAnimationRef.current,
      )
    ) {
      return;
    }
    doneFocusRef.current = "";
    activeFocusAnimationRef.current = null;
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    if (typeof IntersectionObserver === "undefined") {
      viewportVisibleRef.current = true;
      setIsViewportVisible(true);
      return;
    }

    const observer = new IntersectionObserver(([entry]) => {
      const visible = entry?.isIntersecting ?? false;
      viewportVisibleRef.current = visible;
      setIsViewportVisible((current) => (current === visible ? current : visible));
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (isViewportVisible) return;
    // This can run before or after a queued animation frame. The helper keeps
    // both orderings from leaving a completed ticket behind.
    releaseInterruptedFocusTicket();
    cancelSpin();
    cancelPulse();
    cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
  }, [cancelPulse, cancelSpin, isViewportVisible, releaseInterruptedFocusTicket]);

  const runPulseLoop = useCallback(() => {
    if (pulseRafRef.current || spinningRef.current) return;
    const step = (now: number) => {
      const current = pulseRef.current;
      if (!viewportVisibleRef.current) {
        releaseInterruptedFocusTicket();
        pulseRef.current = null;
        pulseRafRef.current = 0;
        return;
      }
      if (!current || pulseProgress(current, now) == null) {
        pulseRef.current = null;
        pulseRafRef.current = 0;
        activeFocusAnimationRef.current = null;
        requestDraw();
        return;
      }
      requestDraw();
      pulseRafRef.current = requestAnimationFrame(step);
    };
    pulseRafRef.current = requestAnimationFrame(step);
  }, [releaseInterruptedFocusTicket, requestDraw]);

  const startPulse = useCallback(
    (id: string) => {
      if (spinningRef.current || !viewportVisibleRef.current) return;
      setUnknownMark(0);
      cancelAnimationFrame(pulseRafRef.current);
      pulseRafRef.current = 0;
      pulseRef.current = { id, start: performance.now(), duration: PULSE_MS };
      if (reducedMotionRef.current) {
        pulseRef.current = null;
        activeFocusAnimationRef.current = null;
        drawRef.current();
        return;
      }
      drawRef.current();
      runPulseLoop();
    },
    [runPulseLoop],
  );

  const startSpin = useCallback(
    (to: [number, number], onArrive?: () => void) => {
      cancelSpin();
      const from: [number, number] = [
        rotationRef.current[0],
        rotationRef.current[1],
      ];
      if (isNearRotation(from, to)) {
        rotationRef.current = to;
        requestDraw();
        onArrive?.();
        return;
      }

      if (reducedMotionRef.current) {
        cancelPulse();
        rotationRef.current = to;
        backgroundDirtyRef.current = true;
        requestDraw();
        onArrive?.();
        return;
      }

      cancelPulse();
      setUnknownMark(0);
      const duration = spinDurationMs(from, to);
      const started = performance.now();
      spinningRef.current = true;

      const step = (now: number) => {
        if (!viewportVisibleRef.current) {
          releaseInterruptedFocusTicket();
          spinningRef.current = false;
          spinRafRef.current = 0;
          return;
        }
        const t = Math.min(1, (now - started) / duration);
        rotationRef.current = rotationAt(from, to, t);
        backgroundDirtyRef.current = true;
        requestDraw();
        if (t < 1) {
          spinRafRef.current = requestAnimationFrame(step);
          return;
        }
        spinningRef.current = false;
        spinRafRef.current = 0;
        backgroundDirtyRef.current = true;
        requestDraw();
        onArrive?.();
      };
      spinRafRef.current = requestAnimationFrame(step);
    },
    [cancelPulse, cancelSpin, releaseInterruptedFocusTicket, requestDraw],
  );

  /* ── 지정된 좌표로 돌리기 ──
     같은 지시를 두 번 수행하지 않도록 표를 끊어 둔다. 이 처리는 다시 그릴 때마다
     딸려 재실행되는데(마우스가 점 위를 스치기만 해도 그렇다), 그때마다 회전을
     되돌리면 사용자가 손으로 돌려 놓은 각도가 제자리로 튕겨 간다. */
  useEffect(() => {
    if (!ready || !focusId || !isViewportVisible) return;
    const ticket = `${focusId}#${focusKey}`;
    if (
      !canStartFocusAnimation(
        ready,
        focusId,
        isViewportVisible,
        ticket,
        doneFocusRef.current,
      )
    ) return;
    const target = ordered.find((m) => m.id === focusId);
    if (!target) return;
    const firstLook = !doneFocusRef.current;
    doneFocusRef.current = ticket;
    activeFocusAnimationRef.current = ticket;
    const to: [number, number] = [-target.lng, -target.lat];
    if (firstLook) {
      rotationRef.current = to;
      backgroundDirtyRef.current = true;
      startPulse(target.id);
      return;
    }
    if (isNearRotation(rotationRef.current, to)) {
      startPulse(target.id);
      return;
    }
    startSpin(to, () => startPulse(target.id));
  }, [focusId, focusKey, isViewportVisible, ordered, ready, requestDraw, startPulse, startSpin]);

  useEffect(() => {
    if (!unknownKey) return;
    cancelSpin();
    cancelPulse();
    activeFocusAnimationRef.current = null;
    setUnknownMark(unknownKey);
  }, [cancelPulse, cancelSpin, unknownKey]);

  /* ── 휠 확대 ── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || allowPageScroll) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      scheduleZoomSettle();
      const factor = e.deltaY < 0 ? WHEEL_STEP : 1 / WHEEL_STEP;
      zoomRef.current = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoomRef.current * factor));
      if (zoomRef.current >= HIGH_DETAIL_PREFETCH_ZOOM) ensureDetailedMap();
      backgroundDirtyRef.current = true;
      requestDraw();
    };
    canvas.addEventListener("wheel", handler, { passive: false });
    return () => {
      canvas.removeEventListener("wheel", handler);
      if (wheelIdleTimerRef.current) clearTimeout(wheelIdleTimerRef.current);
      wheelIdleTimerRef.current = null;
      wheelActiveRef.current = false;
    };
  }, [allowPageScroll, ensureDetailedMap, requestDraw, scheduleZoomSettle]);

  /* ── 끌어서 회전 ── */
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      cancelAnimationFrame(hoverRafRef.current);
      hoverRafRef.current = 0;
      pendingHoverRef.current = null;
      hoverIdRef.current = null;
      hoverCountryRef.current = null;
      setHoverId(null);
      setHoverCountry(null);
      cancelPulse();
      cancelSpin();
      activeFocusAnimationRef.current = null;
      draggingRef.current = true;
      movedRef.current = false;
      dragStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        r0: rotationRef.current[0],
        r1: rotationRef.current[1],
      };
      requestDraw();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [cancelPulse, cancelSpin, requestDraw],
  );

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
        if (dist >= HIT_RADIUS || dist > closestDist) continue;
        if (dist < closestDist || m.id === activeId) {
          closest = m.id;
          closestDist = dist;
        }
      }
      return closest;
    },
    [activeId, ordered, projectionOf],
  );

  /** 커서가 짚은 자리가 어느 나라인지 — 지도 원본이 가진 이름을 그대로 쓴다 */
  const countryAt = useCallback(
    (clientX: number, clientY: number): string | null => {
      const canvas = canvasRef.current;
      const baseMap = baseMapRef.current;
      if (!canvas || !baseMap) return null;
      const rect = canvas.getBoundingClientRect();
      const localX = clientX - rect.left;
      const localY = clientY - rect.top;
      const { w, h } = sizeRef.current;
      const radius = Math.min(w, h) * zoomRef.current;
      if (Math.hypot(localX - w / 2, localY - h / 2) > radius) return null;

      const projection = projectionOf();
      const coord = projection.invert?.([localX, localY]);
      if (!coord || !Number.isFinite(coord[0]) || !Number.isFinite(coord[1])) return null;
      const [lng, lat] = coord;

      const hitMap =
        zoomRef.current >= HIGH_DETAIL_RENDER_ZOOM &&
        detailedMapRef.current?.countryHitRegions.length
          ? detailedMapRef.current
          : baseMap;
      return countryNameAtCoordinate(hitMap, lng, lat);
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
        backgroundDirtyRef.current = true;
        requestDraw();
        return;
      }
      pendingHoverRef.current = { x: e.clientX, y: e.clientY };
      if (hoverRafRef.current) return;
      hoverRafRef.current = requestAnimationFrame(() => {
        hoverRafRef.current = 0;
        const pending = pendingHoverRef.current;
        pendingHoverRef.current = null;
        if (!pending || draggingRef.current) return;

        const hit = hitTest(pending.x, pending.y);
        const pointerCountry = countryAt(pending.x, pending.y);
        const country = hit
          ? visitedRegions.byMarkerId.get(hit) ?? pointerCountry
          : pointerCountry;
        const canvas = canvasRef.current;
        const tooltip = tooltipRef.current;
        if (canvas && tooltip) {
          const rect = canvas.getBoundingClientRect();
          const localX = pending.x - rect.left;
          const localY = pending.y - rect.top;
          const placeLeft = localX > rect.width * 0.68;
          const placeBelow = localY < 64;
          tooltip.style.left = `${localX + (placeLeft ? -10 : 10)}px`;
          tooltip.style.top = `${localY + (placeBelow ? 12 : -10)}px`;
          tooltip.style.transform = `translate(${placeLeft ? "-100%" : "0"}, ${placeBelow ? "0" : "-100%"})`;
        }
        let visualChanged = false;
        if (hoverIdRef.current !== hit) {
          hoverIdRef.current = hit;
          setHoverId(hit);
          visualChanged = true;
        }
        if (hoverCountryRef.current !== country) {
          hoverCountryRef.current = country;
          setHoverCountry(country);
          visualChanged = true;
        }
        if (visualChanged) requestDraw();
      });
    },
    [countryAt, degreesPerPixel, hitTest, requestDraw, visitedRegions],
  );

  const handlePointerUp = useCallback(() => {
    const wasDragging = draggingRef.current;
    draggingRef.current = false;
    if (wasDragging) {
      backgroundDirtyRef.current = true;
      requestDraw();
    }
  }, [requestDraw]);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (movedRef.current || !onSelect) return;
      const hit = hitTest(e.clientX, e.clientY);
      if (hit) {
        cancelSpin();
        activeFocusAnimationRef.current = null;
        startPulse(hit);
        onSelect(hit);
      }
    },
    [cancelSpin, hitTest, onSelect, startPulse],
  );

  const zoomBy = useCallback(
    (factor: number) => {
      scheduleZoomSettle();
      zoomRef.current = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoomRef.current * factor));
      if (zoomRef.current >= HIGH_DETAIL_PREFETCH_ZOOM) ensureDetailedMap();
      backgroundDirtyRef.current = true;
      requestDraw();
    },
    [ensureDetailedMap, requestDraw, scheduleZoomSettle],
  );

  const handleReset = useCallback(() => {
    cancelSpin();
    activeFocusAnimationRef.current = null;
    rotationRef.current = homeRotation;
    zoomRef.current = homeZoom;
    backgroundDirtyRef.current = true;
    requestDraw();
  }, [cancelSpin, homeRotation, homeZoom, requestDraw]);

  const btnClass = `${
    fillContainer ? "h-9 w-9 text-base" : "h-7 w-7 text-sm"
  } flex cursor-pointer items-center justify-center rounded border border-accent-dim/40 bg-bg-secondary/90 font-bold text-text-secondary hover:border-accent hover:text-accent`;

  return (
    <div
      ref={containerRef}
      data-world-globe
      className={`relative overflow-hidden rounded border border-accent-dim/30 bg-bg-secondary select-none ${className}`}
      style={fillContainer ? undefined : globeFrameStyle(maxHeight)}
    >
      {mapNote && (
        <div
          className={`pointer-events-none absolute z-10 rounded border border-white/10 bg-black/45 font-mono tracking-wide text-text-secondary/70 backdrop-blur-sm ${
            fillContainer
              ? "left-3 top-3 px-2.5 py-1.5 text-[11px]"
              : "left-2 top-2 px-2 py-1 text-[9px]"
          }`}
        >
          {mapNote}
        </div>
      )}

      <div
        className={`absolute right-2 z-10 flex flex-col gap-1 ${
          fillContainer ? "top-3" : "top-2"
        }`}
      >
        <button type="button" onClick={() => zoomBy(BUTTON_STEP)} className={btnClass} aria-label={controlLabels?.zoomIn}>
          +
        </button>
        <button type="button" onClick={() => zoomBy(1 / BUTTON_STEP)} className={btnClass} aria-label={controlLabels?.zoomOut}>
          −
        </button>
        <button
          type="button"
          onClick={handleReset}
          className={`${btnClass} ${fillContainer ? "text-xs" : "text-[10px]"}`}
          aria-label={controlLabels?.reset}
        >
          ↺
        </button>
      </div>

      {onExpand && (
        <button
          type="button"
          onClick={onExpand}
          className="absolute bottom-2 right-2 z-10 flex h-8 items-center gap-1.5 rounded border border-accent-dim/45 bg-bg-secondary/90 px-2.5 font-mono text-[10px] text-text-secondary shadow-lg backdrop-blur-sm hover:border-accent hover:text-accent cursor-pointer"
          aria-label={expandAriaLabel ?? expandLabel}
        >
          <Maximize2 size={13} strokeWidth={1.8} aria-hidden />
          {expandLabel && <span>{expandLabel}</span>}
        </button>
      )}

      <canvas
        ref={canvasRef}
        role="img"
        aria-label={label}
        /* 인라인에서는 세로 동작을 페이지에 양보하고 가로 끌기로 지구본을 돌린다.
           전체화면에서는 모든 방향의 끌기를 지구본이 직접 맡는다. */
        style={{
          display: "block",
          width: "100%",
          height: "100%",
          touchAction: allowPageScroll ? "pan-y" : "none",
          cursor: onSelect && hoverId ? "pointer" : "grab",
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={() => {
          handlePointerUp();
          cancelAnimationFrame(hoverRafRef.current);
          hoverRafRef.current = 0;
          pendingHoverRef.current = null;
          const hadHover =
            hoverIdRef.current !== null || hoverCountryRef.current !== null;
          hoverIdRef.current = null;
          hoverCountryRef.current = null;
          setHoverId(null);
          setHoverCountry(null);
          if (hadHover) requestDraw();
        }}
        onClick={handleClick}
      />

      {unknownMark > 0 && (
        <motion.span
          key={unknownMark}
          initial={{ opacity: 0, scale: 0.72 }}
          animate={{ opacity: [0, 1, 1, 0], scale: [0.72, 1, 1, 1.06] }}
          transition={{ duration: 1.05, times: [0, 0.18, 0.62, 1], ease: "easeOut" }}
          onAnimationComplete={() => setUnknownMark(0)}
          className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center font-serif text-6xl font-semibold text-accent"
          aria-hidden
        >
          ?
        </motion.span>
      )}

      <div
        ref={tooltipRef}
        aria-hidden={!hoverLabel && !tooltipCountry}
        className={`pointer-events-none absolute z-20 rounded border bg-black/90 shadow-lg backdrop-blur-sm ${
          fillContainer
            ? "max-w-[min(320px,78%)] px-3 py-2.5"
            : "max-w-[min(280px,72%)] px-2.5 py-2"
        } ${
          hoverLabel || tooltipCountry ? "visible" : "invisible"
        } ${
            hoverId || tooltipMarkerCount > 0
              ? "border-accent/65 shadow-accent/10"
              : "border-white/15"
          }`}
      >
        <div className="flex items-center gap-2">
          {tooltipCountry && (
            <span
              className={`whitespace-nowrap font-semibold text-text-primary ${
                fillContainer ? "text-sm" : "text-xs"
              }`}
            >
              {localizeCountryName(tooltipCountry, locale)}
            </span>
          )}
          {tooltipMarkerCount > 0 && formatMarkerCount && (
            <span
              className={`whitespace-nowrap rounded bg-accent/15 px-1.5 py-0.5 font-mono text-accent ${
                fillContainer ? "text-[10px]" : "text-[9px]"
              }`}
            >
              {formatMarkerCount(tooltipMarkerCount)}
            </span>
          )}
        </div>
        {hoverLabel && (
          <div
            className={`mt-1 line-clamp-2 leading-relaxed text-accent ${
              fillContainer ? "text-[13px]" : "text-[11px]"
            }`}
          >
            {hoverLabel}
          </div>
        )}
      </div>
    </div>
  );
}
