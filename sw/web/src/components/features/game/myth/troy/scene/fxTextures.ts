/*
  파일명: components/features/game/myth/troy/scene/fxTextures.ts
  기능: 캔버스로 그리는 작은 텍스처
  책임: 빛 번짐·그림자 얼룩·빛 고리·점선처럼 여러 층이 함께 쓰는 텍스처를 한 번만 그려 나눠 쓴다.
        모두 검은 바탕에 회색조로 그린다 — alphaMap은 초록 채널을 읽고, 더하기 섞기는 검정이 아무것도 더하지 않기 때문이다.
        뷰가 모두 사라져도 남겨 두는 작은 공용 자원이다(합쳐 수십 KB).
*/ // ------------------------------
import { CanvasTexture, RepeatWrapping, type Texture } from "three";

const cache = new Map<string, Texture>();

type Stop = [offset: number, level: number];

function canvasTexture(key: string, w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void): Texture {
  const hit = cache.get(key);
  if (hit) return hit;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "rgb(0,0,0)";
    ctx.fillRect(0, 0, w, h);
    draw(ctx);
  }
  const tex = new CanvasTexture(canvas);
  cache.set(key, tex);
  return tex;
}

// 가운데에서 바깥으로 밝기(0~1)가 바뀌는 둥근 그라데이션
function radial(size: number, inner: number, stops: Stop[]) {
  return (ctx: CanvasRenderingContext2D) => {
    const c = size / 2;
    const g = ctx.createRadialGradient(c, c, inner, c, c, c);
    stops.forEach(([at, level]) => {
      const v = Math.round(level * 255);
      g.addColorStop(at, `rgb(${v},${v},${v})`);
    });
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  };
}

// 가운데가 희고 가장자리로 사라지는 둥근 빛(번짐 스프라이트·바닥 번쩍임)
export function glowTexture(): Texture {
  return canvasTexture("glow", 64, 64, radial(64, 0, [[0, 1], [0.25, 0.55], [0.6, 0.14], [1, 0]]));
}

// 받침판 아래 깔리는 부드러운 그림자 얼룩: 가장자리가 흐린 둥근 네모(흐림 필터 없이 겹쳐 그려 어느 브라우저에서나 같다)
export function blobTexture(): Texture {
  return canvasTexture("blob", 256, 256, (ctx) => {
    ctx.fillStyle = "rgba(255,255,255,0.1)";
    for (let inset = 2; inset <= 30; inset += 1.5) {
      const size = 256 - inset * 2;
      ctx.beginPath();
      ctx.roundRect(inset, inset, size, size, Math.max(4, 34 - inset));
      ctx.fill();
    }
  });
}

// 가운데가 빈 빛 고리(충격파·수준 오름 고리)
export function ringTexture(): Texture {
  return canvasTexture("ring", 128, 128, radial(128, 30, [[0, 0], [0.55, 1], [0.75, 0.45], [1, 0]]));
}

// 길 미리 보기의 흐르는 점선
export function dashTexture(): Texture {
  const tex = canvasTexture("dash", 64, 8, (ctx) => {
    ctx.fillStyle = "rgb(90,90,90)";
    ctx.fillRect(0, 0, 64, 8);
    ctx.fillStyle = "rgb(255,255,255)";
    ctx.fillRect(0, 0, 40, 8);
  });
  tex.wrapS = RepeatWrapping;
  tex.wrapT = RepeatWrapping;
  return tex;
}
