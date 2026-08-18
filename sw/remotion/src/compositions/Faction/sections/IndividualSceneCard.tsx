import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import type { FactionIndividualScene, Orientation } from "../types";
import { BG } from "../constants";
import { f } from "../timing";
import { imgSrc } from "../utils";
import { Typewriter } from "../../../components/caption/Typewriter";
import {
  CaptionIdentityText,
  CaptionSwapSlot,
  resolveFactionCaptionAppearance,
} from "./CaptionSwapSlot";
import { FilledImage } from "./FilledImage";
import {
  FACTION_SCENE_EXIT_FADE_SEC,
  factionSceneCaptionPageTimings,
  factionSceneTiming,
} from "@feelandnote/shared/lib/faction-scene-timing";

const CLAMP = {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
} as const;

const IndividualSceneCaption: React.FC<{
  caption: string;
  cueStart: number;
  captionEnterSec: number;
  fontSize: number;
  fontFamily: string;
}> = ({ caption, cueStart, captionEnterSec, fontSize, fontFamily }) => {
  const frame = useCurrentFrame();
  const pages = React.useMemo(
    () => factionSceneCaptionPageTimings(caption),
    [caption],
  );

  return (
    <div style={{ display: "grid", width: "100%" }}>
      {pages.map((page, index) => {
        const pageStartFrame = cueStart + f(captionEnterSec + page.startSec);
        const revealStartFrame = cueStart + f(captionEnterSec + page.revealStartSec);
        const nextPage = pages[index + 1];
        const opacityIn = index === 0
          ? 1
          : interpolate(frame, [pageStartFrame, revealStartFrame], [0, 1], CLAMP);
        const opacityOut = nextPage
          ? interpolate(
              frame,
              [
                cueStart + f(captionEnterSec + nextPage.startSec),
                cueStart + f(captionEnterSec + nextPage.revealStartSec),
              ],
              [1, 0],
              CLAMP,
            )
          : 1;

        return (
          <div
            key={`${index}-${page.text}`}
            style={{ gridArea: "1 / 1", opacity: opacityIn * opacityOut }}
          >
            <Typewriter
              text={page.text}
              startFrame={revealStartFrame}
              spreadFrames={Math.max(1, f(page.revealSec))}
              charLevel
              fontSize={fontSize}
              color="#f2ebe0"
              highlightColor="#ffffff"
              keepLit
              style={{
                width: "100%",
                maxWidth: 760,
                margin: "0 auto",
                color: "#f2ebe0",
                fontFamily,
                fontWeight: 700,
                lineHeight: 1.35,
                textAlign: "center",
                wordBreak: "keep-all",
                whiteSpace: "pre-wrap",
                textShadow:
                  "0 0 8px rgba(0,0,0,0.95), 0 0 20px rgba(0,0,0,0.78), 0 3px 10px rgba(0,0,0,0.7)",
                WebkitTextStroke: "1.2px rgba(0,0,0,0.92)",
                paintOrder: "stroke fill",
              }}
            />
          </div>
        );
      })}
    </div>
  );
};

/**
 * 개별 장면 — 인물 등록·직함·대사·음성 없이 사건 하나를 짧게 통과한다.
 * media가 없더라도 편집 단계에서 바로 흐름을 확인할 수 있도록 텍스트 카드로 렌더한다.
 */
export const IndividualSceneCard: React.FC<{
  scene: FactionIndividualScene;
  episodeName: string;
  cueStart: number;
  cueDuration: number;
  orientation: Orientation;
  captionPosition?: "bottom" | "center";
  captionSize?: "default" | "large";
  captionFont?: "default" | "serif";
  captionIdHoldSec?: number;
}> = ({
  scene,
  episodeName,
  cueStart,
  cueDuration,
  orientation,
  captionPosition,
  captionSize,
  captionFont,
  captionIdHoldSec,
}) => {
  const frame = useCurrentFrame();
  const end = cueStart + cueDuration;
  const local = frame - cueStart;
  const hasCaption = !!scene.caption?.trim();
  // 자막형 인물 컷과 같은 순서: 장면 제목(신원) → 같은 자리의 해설 자막.
  const sceneTiming = factionSceneTiming({ ...scene, captionIdHoldSec });
  const captionEnterSec = sceneTiming.captionStartSec;
  const captionAppearance = resolveFactionCaptionAppearance(orientation, {
    position: captionPosition,
    size: captionSize,
    font: captionFont,
  });
  const textOut = interpolate(
    frame,
    [end - f(FACTION_SCENE_EXIT_FADE_SEC), end - f(0.12)],
    [1, 0],
    CLAMP,
  );
  const zoom = interpolate(frame, [cueStart, end], [1.01, 1.065], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const objPos = `${scene.mediaCrop?.x ?? 50}% ${scene.mediaCrop?.y ?? 50}%`;
  // 한 장면 안의 배경 교체 — 지정한 자막 단락이 뜨는 시점에 다음 사진이 겹쳐 떠오른다.
  // 제목을 그대로 둔 채 컷만 나누는 용도라, 교체본마다 줌을 처음부터 다시 시작한다.
  const captionPages = factionSceneCaptionPageTimings(scene.caption);
  const mediaChanges = (scene.mediaChanges ?? [])
    .filter((c) => !!c.media)
    .map((c) => {
      const page = captionPages[c.paragraph];
      const atSec = captionEnterSec + (page ? page.revealStartSec : 0);
      return { ...c, at: cueStart + f(atSec) };
    })
    .filter((c) => c.at > cueStart && c.at < end)
    .sort((a, b) => a.at - b.at);
  const MEDIA_FADE_SEC = 0.5;

  return (
    <AbsoluteFill style={{ backgroundColor: BG }}>
      {scene.media ? (
        <FilledImage
          src={imgSrc(episodeName, scene.media)}
          objPos={objPos}
          scale={(scene.mediaCrop?.scale ?? 1) * zoom}
          startFrame={cueStart}
          onError={() => {}}
        />
      ) : (
        <AbsoluteFill
          style={{
            background:
              "radial-gradient(ellipse 90% 70% at 50% 44%, rgba(36,70,82,0.44) 0%, rgba(11,24,31,0.35) 42%, rgba(10,10,15,1) 82%)",
          }}
        />
      )}
      {mediaChanges.map((c, i) => {
        const op = interpolate(
          frame,
          [c.at - f(MEDIA_FADE_SEC), c.at],
          [0, 1],
          CLAMP,
        );
        if (op <= 0) return null;
        const cZoom = interpolate(frame, [c.at, end], [1.01, 1.065], CLAMP);
        return (
          <AbsoluteFill key={`sm-${i}`} style={{ opacity: op }}>
            <FilledImage
              src={imgSrc(episodeName, c.media)}
              objPos={`${c.crop?.x ?? scene.mediaCrop?.x ?? 50}% ${c.crop?.y ?? scene.mediaCrop?.y ?? 50}%`}
              scale={(c.crop?.scale ?? 1) * cZoom}
              startFrame={c.at}
              onError={() => {}}
            />
          </AbsoluteFill>
        );
      })}
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.34) 0%, rgba(0,0,0,0.04) 34%, rgba(0,0,0,0.82) 100%)",
        }}
      />
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse 88% 76% at 50% 45%, transparent 35%, rgba(0,0,0,0.6) 100%)",
        }}
      />
      <CaptionSwapSlot
        localFrame={local}
        captionEnterSec={captionEnterSec}
        exitOpacity={textOut}
        hasCaption={hasCaption}
        captionSlotStyle={captionAppearance.slotStyle}
        captionMinHeight={captionAppearance.minHeight}
        identity={<CaptionIdentityText>{scene.title}</CaptionIdentityText>}
        caption={
          hasCaption ? (
            <IndividualSceneCaption
              caption={scene.caption!}
              cueStart={cueStart}
              captionEnterSec={captionEnterSec}
              fontSize={captionAppearance.fontSize}
              fontFamily={captionAppearance.fontFamily}
            />
          ) : undefined
        }
      />
    </AbsoluteFill>
  );
};
