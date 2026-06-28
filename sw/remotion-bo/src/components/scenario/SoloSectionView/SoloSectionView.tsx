'use client'

import { VoiceEditorModal } from '../VoiceEditorModal'
import { ImagePool } from '../ImagePool'
import { ExpandedVoicePanel, type EleSettings, type EleSendOpts } from '../../scenario-voice'
import type { VoiceSection } from '../../voice-utils'
import type { EpisodeData } from '../../EpisodeEditor'
import { EMPTY_FILE_BOOK_MAP, EMPTY_FILE_FIELD_MAP } from './utils'
import { useSoloSections } from './useSoloSections'
import { SectionCard } from './sections/SectionCard'

/**
 * 솔로 자유섹션 편집기.
 *
 * episode 전체 저장 흐름과 분리된 독립 컴포넌트다. 책 폴더의 solo.{locale}.json 을
 * 자체 GET/PUT 한다. 책은 인덱스(bookIndex)로 식별하고, 서버가 폴더 순서로 매칭한다.
 *
 * 이미지: 쇼츠·롱폼과 동일한 공용 인프라(segToImages·mediaPath·InlineImageRow·앵커 픽업)를 그대로 쓴다.
 * 저장 경로는 쇼츠와 동일한 풀 경로(episodes/...)라 BO 썸네일·영상 렌더 양쪽이 모두 찾는다.
 *
 * 음성: 쇼츠·롱폼과 동일한 음성 제어판(재생·엔진 표시·편집기 열기)을 각 섹션에 붙인다.
 */
export function SoloSectionView({
  series, name, bookIndex,
  episode, sectionMap, activeEngine, playingKey, onTogglePlay,
  eleSettings, eleSendOpts, onEleSendOptsChange,
  onEpisodeChange, onSave, onRefreshFiles,
}: {
  series: string
  name: string
  bookIndex: number
  episode: EpisodeData
  sectionMap: Map<string, VoiceSection>
  activeEngine: (key: string) => string
  playingKey: string | null
  onTogglePlay: (key: string) => void
  eleSettings: EleSettings
  eleSendOpts: EleSendOpts
  onEleSendOptsChange: (o: EleSendOpts) => void
  onEpisodeChange: (ep: EpisodeData) => void
  onSave: (data: EpisodeData) => Promise<unknown>
  onRefreshFiles: () => void
}) {
  const {
    sections, loading, saving, dirty, speakingId, expandedKey, activeIdx, copied, anchorPick,
    folderImages, imageBaseUrl, subFolders, fileFolders, duplicates,
    refreshFolderImages, moveFileToFolder, createFolder, renameFolder, deleteFolder,
    ops, sectionKeys, expandedText, usedFiles, voiceOverride,
    setSections, setExpandedKey, setActiveIdx, setAnchorPick,
    speak, patch, confirmAnchor, add, remove, move, save, copyAll,
  } = useSoloSections({ series, name, bookIndex, episode, sectionMap, activeEngine })

  if (loading) {
    return <div className="p-4 text-sm text-text-secondary">자유섹션 불러오는 중…</div>
  }

  return (
    <div className="relative space-y-3">
      {/* 헤더 — 안내 + 내용 복사 (저장은 우하단 플로팅 버튼) */}
      <div className="rounded border border-border/70 bg-bg-card px-3 py-2 flex items-center justify-between gap-2">
        <div className="text-[12px] text-text-secondary">
          1권 모드 자유 구성 · <span className="text-text-primary font-bold">{sections.length}개 섹션</span>
          <span className="ml-2 opacity-70">인사·책 표지·마무리는 자동으로 붙습니다.</span>
        </div>
        <button
          onClick={copyAll}
          className="shrink-0 px-2.5 py-1 text-sm font-bold text-text-secondary hover:text-accent border border-border/40 rounded hover:border-accent/40"
        >
          {copied ? '복사됨' : '내용 복사'}
        </button>
      </div>

      <div className="flex gap-0">
        <div className="flex-1 min-w-0 space-y-3">
          {/* 섹션 목록 */}
          {sections.map((s, i) => (
            <SectionCard
              key={s.id}
              s={s}
              i={i}
              total={sections.length}
              segKey={sectionKeys[i]}
              activeEngine={activeEngine}
              sectionMap={sectionMap}
              imgs={ops.getImages(i)}
              imageBaseUrl={imageBaseUrl}
              activeIdx={activeIdx}
              anchorPick={anchorPick}
              speakingId={speakingId}
              playingKey={playingKey}
              onSetActive={setActiveIdx}
              onDropImage={ops.dropImage}
              onMove={move}
              onPatch={patch}
              onSpeak={speak}
              onRemove={remove}
              onCommitText={ops.commitTextWithAnchors}
              onConfirmAnchor={confirmAnchor}
              onReplaceImage={ops.replaceImage}
              onRemoveImage={ops.removeImage}
              onRemoveImageOnly={ops.removeImageOnly}
              onStartPick={setAnchorPick}
              onCancelPick={() => setAnchorPick(null)}
              onTogglePlay={onTogglePlay}
              onOpenEditor={setExpandedKey}
            />
          ))}

          {/* 섹션 추가 */}
          <button
            onClick={add}
            className="w-full py-2 text-[12px] font-bold rounded border border-dashed border-border/70 text-text-secondary hover:border-accent/50 hover:text-accent"
          >+ 섹션 추가</button>
        </div>

        {/* 우측: 이미지 풀 — 쇼츠·롱폼과 동일. 끌어다 놓으면 섹션에 배치된다. */}
        <ImagePool
          allImages={folderImages}
          usedFiles={usedFiles}
          fileBookMap={EMPTY_FILE_BOOK_MAP}
          fileFieldMap={EMPTY_FILE_FIELD_MAP}
          view="solo"
          imageBaseUrl={imageBaseUrl}
          onDrop={fn => { if (sections.length) ops.dropImage(Math.min(activeIdx, sections.length - 1), fn) }}
          onDelete={async fn => {
            await fetch(`${imageBaseUrl}/${fn}`, { method: 'DELETE' })
            // 삭제된 파일을 가리키던 섹션 참조를 비운다 — 풀 키(basename)로 매칭.
            const base = (p: string) => (p.split('/').pop() ?? p)
            const tgt = base(fn)
            setSections(prev => prev.map(s => ({
              ...s,
              image: s.image && base(s.image) === tgt ? undefined : s.image,
              imageChangeAt: s.imageChangeAt?.map(c => (c.image && base(c.image) === tgt ? { ...c, image: '' } : c)),
            })))
            refreshFolderImages()
          }}
          onOpenFolder={() => fetch(`/api/${series}/images/${name}`, { method: 'POST' })}
          onOpenFolderPath={folder => fetch(`/api/${series}/images/${name}/${folder}`, { method: 'POST' })}
          onRefresh={refreshFolderImages}
          subFolders={subFolders}
          fileFolders={fileFolders}
          duplicates={duplicates}
          onMoveFile={moveFileToFolder}
          onCreateFolder={createFolder}
          onRenameFolder={renameFolder}
          onDeleteFolder={deleteFolder}
        />
      </div>

      {/* 음성 편집 모달 — 쇼츠와 동일한 ExpandedVoicePanel 재사용. 솔로 본문을 합성 원문으로 주입한다. */}
      <VoiceEditorModal
        openKey={expandedKey}
        onClose={() => setExpandedKey(null)}
        renderExpanded={(key, mode) => (
          <ExpandedVoicePanel
            sectionKey={key}
            section={sectionMap.get(key) ?? { key, description: '' }}
            episode={episode}
            series={series}
            name={name}
            voiceId={(episode.host as { elevenlabsVoiceId?: string } | undefined)?.elevenlabsVoiceId}
            eleSettings={eleSettings}
            eleSendOpts={eleSendOpts}
            onEleSendOptsChange={onEleSendOptsChange}
            activeEngine={activeEngine(key)}
            onEpisodeChange={onEpisodeChange}
            onSave={onSave}
            onRefresh={onRefreshFiles}
            expandMode={mode}
            overrideText={expandedText}
            voiceOverride={voiceOverride}
          />
        )}
      />

      {/* 전역 플로팅 저장 — 스크롤 위치와 무관하게 항시 노출. 저장할 변경이 없으면 회색 「저장됨」. */}
      <button
        onClick={save}
        disabled={saving || !dirty}
        className="fixed bottom-6 right-6 z-50 px-5 py-2.5 rounded-full text-white text-sm font-bold shadow-lg transition-all bg-emerald-500 hover:bg-emerald-400 shadow-emerald-500/30 disabled:bg-slate-400 disabled:shadow-none disabled:cursor-default"
      >
        {saving ? '저장 중…' : dirty ? '솔로 저장' : '저장됨'}
      </button>
    </div>
  )
}
