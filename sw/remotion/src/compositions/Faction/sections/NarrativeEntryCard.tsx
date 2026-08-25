import React from "react";
import { AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import type { FactionPerson, Orientation } from "../types";
import { BG } from "../constants";
import {
  activeFactionMediaLayers,
  f,
  narrativeEntryTextExitFrames,
  narrativeMediaCutsOf,
  sceneBeatAudioPlaySec,
  sceneBeatCaptionMode,
  sceneBeatsOf,
  sceneBeatTextExitFrames,
  sceneTimingInputOf,
} from "../timing";
import { clampRate, dbToLinear, vnSceneBeat, voiceRelPath } from "../voice-names";
import { imgSrc } from "../utils";
import { Typewriter } from "../../../components/caption/Typewriter";
import { ShortCaption } from "../../../components/caption/ShortCaption";
import {
  CaptionIdentityText,
  CaptionSwapSlot,
  resolveFactionCaptionAppearance,
} from "./CaptionSwapSlot";
import { FilledImage } from "./FilledImage";
import {
  factionSceneBeatTimings,
  type FactionSceneCaptionPageTiming,
} from "@feelandnote/shared/lib/faction-scene-timing";

const CLAMP = {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
} as const;

/**
 * 한 덩어리의 본문. 문단(빈 줄)마다 화면이 넘어가며, 앞 문단이 사라지는 자리에 다음 문단이 떠오른다.
 * 문단 시각은 타이밍 SSoT가 계산해 넘겨준 값을 그대로 쓴다(음원이 있으면 발화 길이에 맞춰져 있다).
 */
const SceneBeatText: React.FC<{
  pages: FactionSceneCaptionPageTiming[];
  /** 본문이 뜨기 시작하는 절대 프레임 */
  textStartFrame: number;
  fontSize: number;
  fontFamily: string;
}> = ({ pages, textStartFrame, fontSize, fontFamily }) => {
  const frame = useCurrentFrame();

  return (
    <div style={{ display: "grid", width: "100%" }}>
      {pages.map((page, index) => {
        const pageStartFrame = textStartFrame + f(page.startSec);
        const revealStartFrame = textStartFrame + f(page.revealStartSec);
        const nextPage = pages[index + 1];
        const opacityIn = index === 0
          ? 1
          : interpolate(frame, [pageStartFrame, revealStartFrame], [0, 1], CLAMP);
        const opacityOut = nextPage
          ? interpolate(
              frame,
              [
                textStartFrame + f(nextPage.startSec),
                textStartFrame + f(nextPage.revealStartSec),
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
 * 서사 항목 컷.
 *
 * 배경 위에서 덩어리(beat)가 순서대로 흐른다. 화자가 있는 덩어리는 그 인물의 대사로,
 * 없는 덩어리는 장면 제목을 이름 자리에 둔 해설로 뜬다. 같은 화자가 이어 말하면 이름을
 * 다시 띄우지 않고 본문만 교체한다. 덩어리마다 배경을 갈아 끼우고 음성을 재생할 수 있다.
 *
 * 덩어리를 쓰지 않는 구 데이터는 해설 하나짜리 장면으로 정규화돼 예전과 똑같이 그려진다.
 */
export const NarrativeEntryCard: React.FC<{
  scene: FactionPerson;
  episodeName: string;
  cueStart: number;
  cueDuration: number;
  orientation: Orientation;
  captionPosition?: "bottom" | "center";
  captionSize?: "default" | "large";
  captionFont?: "default" | "serif";
  captionIdHoldSec?: number;
  nextEnterSec?: number;
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
  nextEnterSec = 0,
}) => {
  const frame = useCurrentFrame();
  const end = cueStart + cueDuration;

  const beats = sceneBeatsOf(scene);
  // 컷 빌더(sceneSecOf)와 반드시 같은 입력을 써야 화면과 컷 길이가 어긋나지 않는다.
  const beatTimings = factionSceneBeatTimings(sceneTimingInputOf(scene, captionIdHoldSec));

  const captionAppearance = resolveFactionCaptionAppearance(orientation, {
    position: captionPosition,
    size: captionSize,
    font: captionFont,
  });
  const textOut = interpolate(frame, narrativeEntryTextExitFrames(end, nextEnterSec), [1, 0], CLAMP);
  const zoom = interpolate(frame, [cueStart, end], [1.01, 1.065], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const objPos = `${scene.imageCrop?.x ?? 50}% ${scene.imageCrop?.y ?? 50}%`;

  // 배경 교체 — 전환 중에는 현재 사진과 다음 사진만 겹치고, 완료 즉시 이전 사진을 렌더 트리에서 뺀다.
  const mediaCuts = React.useMemo(
    () => narrativeMediaCutsOf(scene, cueStart, cueDuration, beatTimings),
    [scene, cueStart, cueDuration, beatTimings],
  );
  const MEDIA_FADE_SEC = 0.5;
  const activeMedia = activeFactionMediaLayers(
    mediaCuts.map(cut => cut.at),
    frame,
    f(MEDIA_FADE_SEC),
  );
  const activeMediaIndexes = new Set(activeMedia.indexes);

  return (
    <AbsoluteFill style={{ backgroundColor: BG }}>
      {activeMedia.showBase && scene.image ? (
        <FilledImage
          src={imgSrc(episodeName, scene.image)}
          objPos={objPos}
          scale={(scene.imageCrop?.scale ?? 1) * zoom}
          startFrame={cueStart}
          onError={() => {}}
        />
      ) : activeMedia.showBase ? (
        <AbsoluteFill
          style={{
            background:
              "radial-gradient(ellipse 90% 70% at 50% 44%, rgba(36,70,82,0.44) 0%, rgba(11,24,31,0.35) 42%, rgba(10,10,15,1) 82%)",
          }}
        />
      ) : null}
      {mediaCuts.map((c, i) => {
        if (!activeMediaIndexes.has(i)) return null;
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
              objPos={`${c.crop?.x ?? scene.imageCrop?.x ?? 50}% ${c.crop?.y ?? scene.imageCrop?.y ?? 50}%`}
              scale={(c.crop?.scale ?? 1) * cZoom}
              startFrame={c.at}
              filter={c.filter}
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

      {beatTimings.map((timing, index) => {
        const hasText = !!timing.text.trim();
        const next = beatTimings[index + 1];
        // 다음 덩어리가 뜨기 시작하면 이 덩어리는 그 자리를 내준다. 마지막 덩어리는 컷 끝 페이드를 따른다.
        const handOffFrames = next ? sceneBeatTextExitFrames(cueStart, next) : undefined;
        const handOff = next
          ? interpolate(
              frame,
              handOffFrames!,
              [1, 0],
              CLAMP,
            )
          : 1;
        // 화자가 없으면 장면 제목이 이름 자리를 지킨다.
        const identity = timing.speaker || beats[index]?.label || scene.name;
        const wholeCaption = sceneBeatCaptionMode(beats[index]) === 'whole';

        return (
          <CaptionSwapSlot
            key={`beat-${index}`}
            localFrame={frame - (cueStart + f(timing.startSec))}
            captionEnterSec={timing.textStartSec - timing.startSec}
            exitOpacity={textOut * handOff}
            hasCaption={hasText}
            showIdentity={timing.showsIdentity}
            captionSlotStyle={captionAppearance.slotStyle}
            captionMinHeight={captionAppearance.minHeight}
            identity={<CaptionIdentityText>{identity}</CaptionIdentityText>}
            caption={
              hasText ? (
                wholeCaption ? (
                  <ShortCaption
                    text={timing.text}
                    startFrame={cueStart + f(timing.textStartSec)}
                    spreadFrames={Math.max(1, f(timing.completeSec - timing.textStartSec))}
                    fontSize={captionAppearance.fontSize}
                    fontFamily={captionAppearance.fontFamily}
                    fontWeight={700}
                    maxPanelWidth={760}
                    chrome="shadow"
                  />
                ) : (
                  <SceneBeatText
                    pages={timing.pages}
                    textStartFrame={cueStart + f(timing.textStartSec)}
                    fontSize={captionAppearance.fontSize}
                    fontFamily={captionAppearance.fontFamily}
                  />
                )
              ) : undefined
            }
          />
        );
      })}

      {beats.map((beat, index) => {
        const playSec = sceneBeatAudioPlaySec(beat);
        const timing = beatTimings[index];
        if (!playSec || !timing || !beat.text?.trim()) return null;
        const from = cueStart + f(timing.textStartSec);
        // 음원 뒤로 완독 정지·페이드 여운이 항상 있으므로 시퀀스를 컷 끝까지 열어 둬도 안전하다
        // (끝 글자 씹힘 방지, PersonCard 대사 재생과 같은 방식).
        return (
          <Sequence
            key={`beat-audio-${index}`}
            from={from}
            durationInFrames={Math.max(f(playSec), end - from)}
          >
            <Audio
              src={staticFile(voiceRelPath(episodeName, beat.voiceFile ?? vnSceneBeat(beat.speaker, beat.text)))}
              volume={dbToLinear(beat.voiceGainDb)}
              playbackRate={clampRate(beat.voicePlaybackRate)}
            />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
