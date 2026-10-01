/*
  파일명: components/features/game/myth/troy/scene/portraits.ts
  기능: 얼굴 메달 그리기
  책임: 아바타를 WebGL이 쓸 수 있는 같은 출처 경로로 받아(data·같은 출처 → 그대로, 아니면 Next 이미지 경로 → CORS 순)
        원으로 오린 메달 캔버스에 그린다. 받는 동안·실패하면 이름 첫 글자 메달을 그린다. 한 주소는 한 번만 받는다.
*/ // ------------------------------
import { CanvasTexture, SRGBColorSpace } from "three";
import type { Side } from "../engine/types";
import { MEDAL_GLOSS, PIECE, SIDE_COLOR, SIDE_DARK } from "./palette";

const SIZE = 128;
const images = new Map<string, Promise<HTMLImageElement | null>>();
// 길마다 되는지 한 번만 알아보고 기억한다(안 되는 길로 아바타마다 헛걸음하지 않게)
const routes = new Map<string, Promise<boolean>>();

function loadImage(src: string, cors: boolean): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    if (cors) img.crossOrigin = "anonymous";
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

async function viaRoute(route: string, src: string, cors: boolean): Promise<HTMLImageElement | null> {
  const known = routes.get(route);
  if (known) return (await known) ? loadImage(src, cors) : null;
  const attempt = loadImage(src, cors);
  routes.set(route, attempt.then(Boolean));
  return attempt;
}

function sameOrigin(url: string): boolean {
  if (url.startsWith("data:") || url.startsWith("blob:")) return true;
  try {
    return new URL(url, window.location.href).origin === window.location.origin;
  } catch {
    return false;
  }
}

async function fetchPortrait(url: string): Promise<HTMLImageElement | null> {
  if (sameOrigin(url)) return loadImage(url, false);
  const optimized = await viaRoute("next-image", `/_next/image?url=${encodeURIComponent(url)}&w=128&q=75`, false);
  if (optimized) return optimized;
  const origin = (() => {
    try {
      return new URL(url).origin;
    } catch {
      return "";
    }
  })();
  return origin ? viaRoute(`cors:${origin}`, url, true) : null;
}

export function portraitImage(url: string): Promise<HTMLImageElement | null> {
  const hit = images.get(url);
  if (hit) return hit;
  const job = fetchPortrait(url);
  images.set(url, job);
  return job;
}

export interface MedalLook {
  side: Side;
  initial: string;
  boss: boolean;
}

function drawMedal(ctx: CanvasRenderingContext2D, look: MedalLook, img: HTMLImageElement | null) {
  const c = SIZE / 2;
  ctx.clearRect(0, 0, SIZE, SIZE);
  ctx.beginPath();
  ctx.arc(c, c, c - 1, 0, Math.PI * 2);
  ctx.fillStyle = PIECE.medalEdge;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(c, c, c - 4, 0, Math.PI * 2);
  ctx.fillStyle = look.boss ? PIECE.bossRim : SIDE_COLOR[look.side];
  ctx.fill();
  ctx.beginPath();
  ctx.arc(c, c, c - 13, 0, Math.PI * 2);
  ctx.fillStyle = look.boss ? PIECE.bossRim2 : PIECE.medalGold;
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.arc(c, c, c - 16, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = SIDE_DARK[look.side];
  ctx.fillRect(0, 0, SIZE, SIZE);
  if (img) {
    const s = Math.min(img.naturalWidth, img.naturalHeight);
    ctx.drawImage(img, (img.naturalWidth - s) / 2, (img.naturalHeight - s) / 2, s, s, 16, 16, SIZE - 32, SIZE - 32);
  } else {
    ctx.fillStyle = PIECE.initial;
    ctx.font = "800 58px Pretendard, 'Apple SD Gothic Neo', 'Noto Sans KR', system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(look.initial.slice(0, 1), c, c + 3);
  }
  const gloss = ctx.createLinearGradient(0, 16, 0, c);
  gloss.addColorStop(0, MEDAL_GLOSS.top);
  gloss.addColorStop(1, MEDAL_GLOSS.bottom);
  ctx.fillStyle = gloss;
  ctx.fillRect(0, 0, SIZE, c);
  ctx.restore();
}

// 첫 글자 메달을 바로 돌려주고, 아바타가 오면 같은 텍스처에 다시 그린다
export function medalTexture(look: MedalLook, url: string | null): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d");
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 4;
  if (!ctx) return tex;
  drawMedal(ctx, look, null);
  if (url) {
    portraitImage(url).then((img) => {
      if (!img) return;
      drawMedal(ctx, look, img);
      tex.needsUpdate = true;
    });
  }
  return tex;
}
