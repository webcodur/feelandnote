import React from "react";
import { AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import type { FactionPerson, Orientation } from "../types";
import type { VoiceTimings } from "../../../lib/voice-timing";
import { BG } from "../constants";
import {
  activeFactionMediaLayers,
  f,
  narrativeEntryTextExitFrames,
  narrativeMediaCutsOf,
  narrativeMediaLayerStarts,
  sceneBeatAudioPlaySec,
  sceneBeatCaptionMode,
  sceneBeatsOf,
  sceneBeatTextExitFrames,
  sceneTimingInputOf,
} from "../timing";
import { clampRate, dbToLinear, vnBeatVoiceFile, vnTimingKey, voiceRelPath } from "../voice-names";
import { imgSrc } from "../utils";
import { Typewriter } from "../../../components/caption/Typewriter";
import { ShortCaption, captionShadowTextStyle } from "../../../components/caption/ShortCaption";
import {
  CaptionIdentityText,
  CaptionSwapSlot,
  resolveFactionCaptionAppearance,
} from "./CaptionSwapSlot";
import { FilledImage } from "./FilledImage";
import { ClusterShot, cropProps, type ClusterShotMotion, type InheritedClusterShot } from "./GroupCard";
import { HoldGlitch } from "../transitions";
import type { FactionBeatEffects, NarrativeMediaCut } from "../timing";
import {
  factionSceneBeatTimings,
  type FactionSceneCaptionPageTiming,
} from "@feelandnote/shared/lib/faction-scene-timing";

const CLAMP = {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
} as const;

/** 효과를 하나도 지정하지 않은 장면이 예전처럼 아주 천천히 확대되도록 두는 폴백 배율 구간. */
const IDLE_ZOOM_FROM = 1.01;
const IDLE_ZOOM_TO = 1.065;

/**
 * 해설 컷 줌인 전용 감속 배수. 인물 컷과 같은 속도(초당 1.5%)로 당기면 이 화면에서는 급하다 —
 * 본문이 계속 흐르고 사진이 컷마다 바뀌어 그때마다 확대가 처음부터 다시 시작하기 때문이다.
 * 이 화면이 예전에 쓰던 미세 확대(구간당 5.5%p ≈ 초당 0.7%)와 같은 체감으로 맞춘 값.
 * 더 빠르게 당기고 싶으면 그 장면·컷의 줌 속도(zoomSpeed)를 올리면 이 배수 위에 곱해진다.
 */
const NARRATIVE_ZOOMIN_SPEED = 0.5;

/** 장면 계승값(motion) 위에 컷(beat) 자체 지정만 덮어쓴다. 컷이 비운 축은 계승값 그대로다. */
function motionWithBeat(motion: ClusterShotMotion, fx?: FactionBeatEffects): ClusterShotMotion {
  if (!fx) return motion;
  const glitch = fx.holdGlitch === undefined ? motion.glitch
    : fx.holdGlitch === true ? "heavy"
    : fx.holdGlitch === false ? false
    : fx.holdGlitch;
  return {
    noZoom: motion.noZoom,
    hold: fx.holdMotion ?? motion.hold,
    enter: fx.enterMotion ?? motion.enter,
    shake: fx.holdShake ?? motion.shake,
    zoomSpeed: fx.zoomSpeed ?? motion.zoomSpeed,
    glitch,
  };
}

/** 이 사진이 실제로 움직이는가 — 셋 다 비면 예전 미세 확대 폴백으로 그린다. */
function motionIsIdle(m: ClusterShotMotion): boolean {
  return m.noZoom || (m.hold === "none" && !m.shake && m.enter === "none");
}

/** 지지직을 건 사진 — 끄면 사진을 그대로 통과시킨다. 막판 1초(tail)는 이 사진이 걷히기 직전 1초만 지직거린다. */
const NarrativeGlitch: React.FC<{ motion: ClusterShotMotion; frame: number; startFrame: number; end: number; children: React.ReactNode }> = ({ motion, frame, startFrame, end, children }) => {
  if (!motion.glitch) return <>{children}</>;
  return (
    <HoldGlitch
      frame={frame}
      startFrame={startFrame}
      level={motion.glitch}
      gateFromLocal={motion.glitch === "tail" ? Math.max(0, end - startFrame - f(1.0)) : 0}
    >
      {children}
    </HoldGlitch>
  );
};

/**
 * 사진 한 장의 FilledImage 입력. 움직임이 있으면 인물·그룹샷과 같은 공유 계산(cropProps)을 쓰고,
 * 하나도 없으면 예전 그대로 장면 내내 아주 천천히 확대한다 — 효과를 지정하지 않은 옛 편의 그림을 바꾸지 않는다.
 */
function narrativePhotoProps(
  m: ClusterShotMotion,
  crop: NarrativeMediaCut["crop"],
  focus: NarrativeMediaCut["zoomFocus"],
  frame: number,
  layerStart: number,
  idleEnd: number,
): { objPos: string; scale: number; tx: number; ty: number; transformOrigin?: string } {
  const objPos = `${crop?.x ?? 50}% ${crop?.y ?? 50}%`;
  if (motionIsIdle(m)) {
    const idle = interpolate(frame, [layerStart, idleEnd], [IDLE_ZOOM_FROM, IDLE_ZOOM_TO], CLAMP);
    return { objPos, scale: (crop?.scale ?? 1) * idle, tx: 0, ty: 0 };
  }
  // 줌인만 늦춘다. 패닝·켄번스처럼 직접 고른 효과는 지정한 속도 그대로 돌린다.
  const speed = m.zoomSpeed * (m.hold === "zoomin" ? NARRATIVE_ZOOMIN_SPEED : 1);
  return cropProps(crop, objPos, m.hold, frame - layerStart, focus, speed, m.enter, m.shake);
}

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
                // 인물 대사(ShortCaption shadow)와 같은 표면 — 화자 유무로 글자 무게가 달라지지 않게.
                ...captionShadowTextStyle,
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
 * 다시 띄우지 않고 본문만 교체하며, 대사 뒤에 이어지는 해설도 장면 제목을 다시 띄우지 않는다
 * (제 라벨이 있을 때만 그 라벨을 띄운다). 덩어리마다 배경을 갈아 끼우고 음성을 재생할 수 있다.
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
  /** 바로 앞 단체샷을 이어받아 밑바닥 사진으로 계속 그린다 — CueLayer 가 clusterShotHandoffOf 로 판정해 넘긴다. */
  inheritedShot?: InheritedClusterShot;
  /** 장면→세력→에피소드 계승 움직임. 컷(beat)이 자기 값을 지정하면 그 사진에서만 덮어쓴다. */
  motion?: ClusterShotMotion;
  /** 편의 발화 시각 맵(stem → 구간). 자막을 실제 발화에 맞춰 끊는 데 쓴다. */
  voiceTimings?: VoiceTimings;
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
  inheritedShot,
  motion = { noZoom: false, hold: "none", enter: "none", glitch: false, shake: false, zoomSpeed: 1 },
  voiceTimings,
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
  // 장면 대표 화면(첫 컷 사진이 장면 시작과 함께 뜨지 않을 때만 보인다) — 계승 움직임을 그대로 쓴다.
  const baseProps = narrativePhotoProps(motion, scene.imageCrop, scene.zoomFocus, frame, cueStart, end);

  // 배경 교체 — 전환 중에는 현재 사진과 다음 사진만 겹치고, 완료 즉시 이전 사진을 렌더 트리에서 뺀다.
  const mediaCuts = React.useMemo(() => {
    const cuts = narrativeMediaCutsOf(scene, cueStart, cueDuration, beatTimings);
    // 이어받은 단체샷과 같은 사진으로 장면을 여는 컷 화면은 새로 깔지 않는다 — 단체샷 레이어가 이미 그 그림이다.
    return inheritedShot
      ? cuts.filter((c) => !(c.at <= cueStart && c.media === inheritedShot.cluster.image))
      : cuts;
  }, [scene, cueStart, cueDuration, beatTimings, inheritedShot]);
  const MEDIA_FADE_SEC = 0.5;
  // 첫 컷 화면이 장면 시작과 함께 뜨면 대표 화면을 거치지 않는다 — 컷 전환과 겹친 이중 페이드를 없앤다.
  const activeMedia = activeFactionMediaLayers(
    narrativeMediaLayerStarts(mediaCuts, cueStart),
    frame,
    f(MEDIA_FADE_SEC),
  );
  const activeMediaIndexes = new Set(activeMedia.indexes);

  return (
    <AbsoluteFill style={{ backgroundColor: BG }}>
      {activeMedia.showBase && inheritedShot ? (
        <ClusterShot
          episodeName={episodeName}
          cluster={inheritedShot.cluster}
          frame={frame}
          shotStart={inheritedShot.shotStart}
          shotDuration={inheritedShot.shotDuration}
          orientation={orientation}
          motion={inheritedShot.motion}
          onError={() => {}}
        />
      ) : activeMedia.showBase && scene.image ? (
        <NarrativeGlitch motion={motion} frame={frame} startFrame={cueStart} end={end}>
          <FilledImage
            src={imgSrc(episodeName, scene.image)}
            objPos={baseProps.objPos}
            scale={baseProps.scale}
            tx={baseProps.tx}
            ty={baseProps.ty}
            transformOrigin={baseProps.transformOrigin}
            startFrame={cueStart}
            onError={() => {}}
          />
        </NarrativeGlitch>
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
        // 장면 시작과 함께 뜨는 첫 컷 화면은 페이드 없이 바로 — 컷 전환(크로스페이드)이 이미 화면을 열어 준다.
        const op = c.at <= cueStart ? 1 : interpolate(
          frame,
          [c.at - f(MEDIA_FADE_SEC), c.at],
          [0, 1],
          CLAMP,
        );
        if (op <= 0) return null;
        const cutMotion = motionWithBeat(motion, c.effects);
        // 사진맞춤은 이 컷 값 우선, 없으면 장면 대표 화면의 맞춤을 물려받는다(확대 배율만 컷 전용).
        const cutCrop = {
          x: c.crop?.x ?? scene.imageCrop?.x,
          y: c.crop?.y ?? scene.imageCrop?.y,
          scale: c.crop?.scale,
        };
        const p = narrativePhotoProps(cutMotion, cutCrop, c.zoomFocus, frame, c.at, end);
        return (
          <AbsoluteFill key={`sm-${i}`} style={{ opacity: op }}>
            <NarrativeGlitch motion={cutMotion} frame={frame} startFrame={c.at} end={end}>
              <FilledImage
                src={imgSrc(episodeName, c.media)}
                objPos={p.objPos}
                scale={p.scale}
                tx={p.tx}
                ty={p.ty}
                transformOrigin={p.transformOrigin}
                startFrame={c.at}
                filter={c.filter}
                onError={() => {}}
              />
            </NarrativeGlitch>
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
                    // 발화 시각이 있으면 그 덩어리(=본문 줄)마다 한 장씩 넘긴다. 없으면 글자수 기준으로 끊는다.
                    timings={voiceTimings?.[vnTimingKey(vnBeatVoiceFile(beats[index]))]}
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
              src={staticFile(voiceRelPath(episodeName, vnBeatVoiceFile(beat)))}
              volume={dbToLinear(beat.voiceGainDb)}
              playbackRate={clampRate(beat.voicePlaybackRate)}
            />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
