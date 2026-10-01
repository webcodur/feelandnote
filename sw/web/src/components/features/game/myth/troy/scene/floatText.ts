/*
  파일명: components/features/game/myth/troy/scene/floatText.ts
  기능: 떠오르는 글자(피해·회복·빗나감·치명·알림)
  책임: 글자를 캔버스에 굵게 그려 카메라를 보는 스프라이트로 띄우고, 톡 튀어나와 떠오르다 사라지게 한다.
        말은 화면(ui)이 준 문구를 그대로 쓴다(이 층은 문구를 만들지 않는다). 끝나면 텍스처를 푼다.
*/ // ------------------------------
import { CanvasTexture, Group, SRGBColorSpace, Sprite, SpriteMaterial, type Vector3 } from "three";
import { TEXT_TONE } from "./palette";
import { EASE, type Tweens } from "./tween";
import type { TextTone } from "./types";

const HEIGHT = 128;
const FONT = "Pretendard, 'Apple SD Gothic Neo', 'Noto Sans KR', system-ui, sans-serif";

function textSprite(text: string, tone: TextTone): { sprite: Sprite; aspect: number } {
  const big = tone === "crit";
  const px = big ? 92 : 76;
  const probe = document.createElement("canvas").getContext("2d");
  const font = `900 ${px}px ${FONT}`;
  if (probe) probe.font = font;
  const width = Math.ceil((probe?.measureText(text).width ?? px * text.length) + 40);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const c = TEXT_TONE[tone];
    ctx.font = font;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";
    ctx.lineWidth = big ? 16 : 13;
    ctx.strokeStyle = c.stroke;
    ctx.strokeText(text, width / 2, HEIGHT / 2 + 4);
    ctx.fillStyle = c.fill;
    ctx.fillText(text, width / 2, HEIGHT / 2 + 4);
  }
  const map = new CanvasTexture(canvas);
  map.colorSpace = SRGBColorSpace;
  const sprite = new Sprite(new SpriteMaterial({ map, depthTest: false, depthWrite: false, transparent: true, toneMapped: false }));
  sprite.renderOrder = 30;
  return { sprite, aspect: width / HEIGHT };
}

export class FloatTexts {
  readonly group = new Group();

  constructor(private readonly tweens: Tweens, private readonly speed: number) {}

  // at 자리에서 떠올라 사라진다. lift가 있으면 글자 밑변을 화면 위쪽으로 그만큼 띄워(메달·막대를 가리지 않게)
  // 그 자리에서 조금만 오른다. 멀리 오르면 뒷줄 말 글자처럼 보인다. 끝나면 풀린다
  async show(at: Vector3, text: string, tone: TextTone, lift = 0): Promise<void> {
    const { sprite, aspect } = textSprite(text, tone);
    const h = tone === "crit" ? 0.5 : tone === "info" ? 0.34 : 0.4;
    sprite.position.copy(at);
    this.group.add(sprite);
    const y0 = at.y;
    const dur = 1.05 * this.speed;
    await this.tweens.run(dur, (k) => {
      const pop = k < 0.16 ? EASE.outBack(k / 0.16) : 1;
      const s = h * (0.55 + 0.45 * pop) * (tone === "crit" && k < 0.3 ? 1.12 : 1);
      const rise = EASE.outCubic(k);
      sprite.scale.set(s * aspect, s, 1);
      sprite.center.y = lift > 0 ? -(lift + rise * 0.18) / s : 0.5;
      sprite.position.y = lift > 0 ? y0 : y0 + rise * 0.55;
      sprite.material.opacity = k > 0.72 ? 1 - (k - 0.72) / 0.28 : 1;
    }, EASE.linear);
    this.group.remove(sprite);
    sprite.material.map?.dispose();
    sprite.material.dispose();
  }

  dispose() {
    this.group.children.forEach((child) => {
      const sprite = child as Sprite;
      sprite.material.map?.dispose();
      sprite.material.dispose();
    });
    this.group.clear();
  }
}
