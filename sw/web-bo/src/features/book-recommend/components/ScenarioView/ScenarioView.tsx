'use client'

import type { EpisodeData } from '../EpisodeEditor'
import { VoiceToolbar } from '../scenario-voice'
import { VoicePipelineStatus } from '../VoicePipelineStatus'
import {
  LongformView, ShortsView, SoloSectionView,
  BgmPanel, MaterialModal, TtsReplaceModal,
} from '../scenario'
import { VoiceEditorShell, VoiceEngineToggle, BOOK_VOICE_MODES } from '@feelandnote/shared/bo/voice'
import { PlaybackRateControl } from '../scenario/PlaybackRatePanel'
import { AudioPreviewProvider } from '../scenario/AudioPreviewContext'
import { BookTabsBar } from '../scenario/BookTabsBar'
import { SpeakerPanel } from '../scenario/SpeakerPanel'
import { RowCollapseProvider } from '../scenario/RowCollapseContext'
import { CollapseAllBar } from './sections/CollapseAllBar'
import { useScenarioState } from './useScenarioState'

/* ── 메인 ── */
export function ScenarioView({ episode }: { episode: EpisodeData }) {
  const s = useScenarioState(episode)
  const {
    updateEpisode, save, dirty, saving, voiceFiles, series, name, isEn, post, refreshFiles,
    voiceSummary,
    view, subTab, setViewSub,
    mergedSpeakers, mergedEpisode,
    bookToShortsIndex, currentBookIndex0, isBookView,
    currentShortsIndex, effectiveSub, saveScope, books,
    vs, saveVs, hasELVoiceId, mode,
    eleSettings, setEleSettings, eleSendOpts, setEleSendOpts,
    activeEngine, toggleExpand, sectionMap,
    renderExpanded, modalEngineState,
    expandedKey, setExpandedKey, pipelineReloadSignal,
    materialOpen, setMaterialOpen, ttsReplaceOpen, setTtsReplaceOpen,
    audioCtl, playingKey, togglePlay,
    longformImg, shortsImg, setAnchorPick,
    handleSave, syncImages,
    onSpeakersChange, onSpeakerRenameId, onBookReorder,
  } = s

  return (
    <AudioPreviewProvider value={audioCtl}>
    <RowCollapseProvider>
    <div className="relative space-y-3 p-4">
      <VoiceToolbar
        episode={episode} series={series} name={name}
        voiceSummary={voiceSummary} mode={mode} hasELVoiceId={hasELVoiceId}
        vs={vs} onSaveVs={saveVs}
        eleSettings={eleSettings} onEleSettingsChange={setEleSettings}
        eleSendOpts={eleSendOpts} onEleSendOptsChange={setEleSendOpts}
        onRefresh={refreshFiles} post={post}
        speakerPanelNode={
          <SpeakerPanel
            speakers={mergedSpeakers}
            onChange={onSpeakersChange}
            onRenameId={onSpeakerRenameId}
          />
        }
      />

      <VoicePipelineStatus
        series={series}
        name={name}
        onJumpToSegment={(key) => setExpandedKey(key)}
        reloadSignal={pipelineReloadSignal}
      />

      {/* 도구 영역 — 접기 · 배속 · 섹션 카운트 · 이미지 동기화 한 줄에 통합 (선명한 프리미엄 Solid 화) */}
      <div className="mb-2 rounded border border-border/70 bg-bg-card flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-1.5 text-[11px] text-text-secondary shadow-xs">
        <CollapseAllBar />
        <PlaybackRateControl />
        <div className="ml-auto flex items-center gap-2">
          <span>{sectionMap.size}개 섹션 · {voiceFiles.length}개 음성</span>
          <button
            onClick={() => setMaterialOpen(true)}
            className="px-2 py-0.5 text-[11px] border border-border/60 rounded hover:border-accent/40 hover:text-accent bg-bg-main/30"
            title="책 폴더의 「재료.txt」 (작가가 정리한 원자료) 보기"
          >
            재료 메모
          </button>
          <button
            onClick={() => setTtsReplaceOpen(true)}
            className="px-2 py-0.5 text-[11px] border border-border/60 rounded hover:border-accent/40 hover:text-accent bg-bg-main/30"
            title="본문 → TTS 송신 시 적용되는 치환 사전 편집 (episode.tts.replace)"
          >
            TTS 치환
          </button>
          <button
            onClick={syncImages}
            className="px-2 py-0.5 text-[11px] border border-border/60 rounded hover:border-accent/40 hover:text-accent bg-bg-main/30"
            title={isEn ? 'ko에서 이미지 가져오기' : 'en으로 이미지 동기화'}
          >
            {isEn ? 'ko→en 이미지' : '→en 이미지 동기화'}
          </button>
        </div>
      </div>


      <BookTabsBar
        view={view}
        subTab={subTab}
        books={books}
        bookToShortsIndex={bookToShortsIndex}
        onSelect={(nextView, nextSub) => { setViewSub(nextView, nextSub); setAnchorPick(null) }}
        onReorder={onBookReorder}
      />

      {/* 본문 — 탭별 렌더링 */}
      {!isBookView ? (
        // 기본/기타 탭: LongformView 인트로 영역만 (이미지 풀 미노출)
        <LongformView episode={mergedEpisode} sectionMap={sectionMap} onUpdate={updateEpisode}
          onToggleExpand={toggleExpand}
          activeEngine={activeEngine} playingKey={playingKey} onTogglePlay={togglePlay}
          {...longformImg.imgProps}
          focus="meta" />
      ) : (() => {
        // 책 탭: 상단 탭에서 sub(long|short|solo) 가 이미 결정됨(effectiveSub 는 상단에서 계산).
        if (effectiveSub === 'solo') {
          return (
            <SoloSectionView
              series={series} name={name} bookIndex={currentBookIndex0!}
              episode={episode}
              sectionMap={sectionMap}
              activeEngine={activeEngine}
              playingKey={playingKey}
              onTogglePlay={togglePlay}
              eleSettings={eleSettings}
              eleSendOpts={eleSendOpts}
              onEleSendOptsChange={setEleSendOpts}
              onEpisodeChange={updateEpisode}
              onSave={save}
              onRefreshFiles={refreshFiles}
            />
          )
        }
        if (effectiveSub === 'long') {
          return (
            <LongformView episode={mergedEpisode} sectionMap={sectionMap} onUpdate={updateEpisode}
              onToggleExpand={toggleExpand}
              activeEngine={activeEngine} playingKey={playingKey} onTogglePlay={togglePlay}
              {...longformImg.imgProps}
              focus={{ kind: 'book', index: currentBookIndex0! }} />
          )
        }
        return (
          <div className="space-y-4">
            <BgmPanel episode={episode} onUpdate={updateEpisode} series={series} name={name} shortsIndex={currentShortsIndex} />
            <ShortsView episode={episode} shortsIndex={currentShortsIndex} sectionMap={sectionMap} onUpdate={updateEpisode}
              onToggleExpand={toggleExpand}
              activeEngine={activeEngine} playingKey={playingKey} onTogglePlay={togglePlay}
              {...shortsImg.imgProps}
              assignedFiles={shortsImg.assignedFiles} />
          </div>
        )
      })()}

      {/* 솔로 뷰는 SoloSectionView 자체 「솔로 저장」 버튼이 solo.json 만 기록하므로 전체저장 버튼을 숨긴다.
          (전체저장이 솔로 화면에서 책 본문을 옛 메모리로 덮어쓰는 사고를 원천 차단) */}
      {dirty && effectiveSub !== 'solo' && (
        <button
          onClick={() => handleSave(saveScope)}
          disabled={saving}
          className="fixed bottom-6 right-6 z-50 px-5 py-2.5 rounded-full bg-emerald-500 text-white text-sm font-bold shadow-lg shadow-emerald-500/30 hover:bg-emerald-400 disabled:opacity-50"
        >
          {saving ? '저장 중...' : `${effectiveSub === 'short' ? '쇼츠' : '롱폼'} 저장`}
        </button>
      )}

      {/* 음성 편집 전역 모달 — 아코디언 대체 */}
      {expandedKey && (
        <VoiceEditorShell
          subtitle={expandedKey}
          modes={BOOK_VOICE_MODES}
          onClose={() => setExpandedKey(null)}
          headerExtra={modalEngineState ? <VoiceEngineToggle {...modalEngineState} /> : null}
        >
          {mode => renderExpanded(expandedKey, mode)}
        </VoiceEditorShell>
      )}

      {/* 재료.txt 뷰어 — 책 폴더의 원자료 메모 */}
      <MaterialModal
        series={series}
        name={name}
        open={materialOpen}
        onClose={() => setMaterialOpen(false)}
      />

      {/* TTS 치환 사전 편집기 — episode.tts.replace */}
      <TtsReplaceModal
        open={ttsReplaceOpen}
        onClose={() => setTtsReplaceOpen(false)}
      />
    </div>
    </RowCollapseProvider>
    </AudioPreviewProvider>
  )
}
