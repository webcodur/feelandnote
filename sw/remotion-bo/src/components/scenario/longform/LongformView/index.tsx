'use client'

import { useEpisode } from '@/lib/episode-context'
import type { VoiceSection } from '../../../voice-utils'
import type { EpisodeData } from '../../../EpisodeEditor'
import type { ImageEditorProps } from '../../types'
import { ImagePool } from '../../ImagePool'
import { useSfxFiles } from '../../useSfxFiles'
import type { Speaker } from '../../SpeakerPanel'
import { buildHostSpeaker } from '../../speakerHelpers'
import { IntroSection } from './IntroSection'
import { BookSection } from './BookSection'
import { useLongformState } from './useLongformState'
import { stripImageRefs } from '../../utils'

/**
 * 표시 범위 옵션 — 새 탭 체계 대응.
 *   focus='meta' → 인트로(narrator·host) 영역만
 *   focus={ kind: 'book', index } → 그 책 한 권만
 *   undefined  → 전체 (레거시·디버그)
 */
export type LongformFocus = 'meta' | { kind: 'book'; index: number }

export function LongformView({ episode, sectionMap, onUpdate, onToggleExpand, activeEngine, playingKey, onTogglePlay,
  anchorPick, setAnchorPick, imageBaseUrl, folderImages, usedFiles, fileBookMap, fileFieldMap, view, refreshFolderImages, getImages,
  removeImage, removeImageOnly, replaceImage, addAnchor, dropImage, handlePick, confirmAnchor, crossUsage,
  subFolders, fileFolders, duplicates, moveFileToFolder, createFolder, renameFolder, deleteFolder,
  focus }: {
  episode: EpisodeData; sectionMap: Map<string, VoiceSection>
  onUpdate: (ep: EpisodeData) => void
  onToggleExpand: (key: string) => void
  activeEngine: (key: string) => string; playingKey: string | null; onTogglePlay: (key: string, gainDb?: number | null) => void
  focus?: LongformFocus
} & ImageEditorProps) {
  const { series, name } = useEpisode()
  const allBooks = episode.books ?? []

  // focus 별 표시 — 인트로 노출 여부, 책 인덱스 화이트리스트
  // 쇼츠 전용 에피소드(narrator/host 없음)는 인트로 영역 자체를 그리지 않는다.
  const hasIntroData = !!episode.narrator && !!episode.host
  const showIntro = (focus === 'meta' || focus === undefined) && hasIntroData
  const focusedBookIdx = (focus && focus !== 'meta') ? focus.index : null
  const books = focus === 'meta'
    ? []
    : focusedBookIdx != null
      ? (allBooks[focusedBookIdx] ? [allBooks[focusedBookIdx]] : [])
      : allBooks
  const realIndexOf = (displayI: number) => focusedBookIdx != null ? focusedBookIdx : displayI
  const isFocused = focusedBookIdx != null

  const state = useLongformState({ episode, onUpdate, series, name, books, allBooks, fileBookMap })
  const { files: sfxFiles, basePath: sfxBase } = useSfxFiles(series, name)
  // host 가상 Speaker(맨 앞 고정) + episode.speakers. 'host' id가 옛 데이터에 있어도 가상 host 우선.
  const epSpeakers: Speaker[] = Array.isArray(episode.speakers) ? episode.speakers : []
  const speakersList: Speaker[] = [buildHostSpeaker(episode), ...epSpeakers.filter(s => s.id !== 'host')]

  return (
    <div className="space-y-1">
      {showIntro && (
        <IntroSection
          episode={episode}
          sectionMap={sectionMap}
          onUpdate={onUpdate}
          onToggleExpand={onToggleExpand}
          activeEngine={activeEngine}
          playingKey={playingKey}
          onTogglePlay={onTogglePlay}
          series={series}
          name={name}
          saveField={state.saveField}
          sfxFiles={sfxFiles}
          sfxBase={sfxBase}
          speakers={speakersList}
          uN={state.uN}
          uH={state.uH}
        />
      )}

      {books.length > 0 && (
        <div className="flex gap-0">
          <div className="flex-1 min-w-0">
            {books.map((book: any, displayI: number) => {
              const i = realIndexOf(displayI)
              return (
                <BookSection
                  key={i}
                  book={book}
                  displayI={displayI}
                  realIdx={i}
                  totalBooks={allBooks.length}
                  isFocused={isFocused}
                  sectionMap={sectionMap}
                  series={series}
                  name={name}
                  allImgs={getImages(i)}
                  anchorPick={anchorPick}
                  setAnchorPick={setAnchorPick}
                  confirmAnchor={confirmAnchor}
                  imageBaseUrl={imageBaseUrl}
                  replaceImage={replaceImage}
                  removeImage={removeImage}
                  removeImageOnly={removeImageOnly}
                  crossUsage={crossUsage}
                  uB={state.uB}
                  dropImage={dropImage}
                  addAnchor={addAnchor}
                  handlePick={handlePick}
                  updateQuotePair={state.updateQuotePair}
                  addQuotePair={state.addQuotePair}
                  removeQuotePair={state.removeQuotePair}
                  saveField={state.saveField}
                  activeEngine={activeEngine}
                  playingKey={playingKey}
                  onTogglePlay={onTogglePlay}
                  onToggleExpand={onToggleExpand}
                  musicFiles={state.musicFiles}
                  setBookBgm={state.setBookBgm}
                  sfxFiles={sfxFiles}
                  sfxBase={sfxBase}
                  speakers={speakersList}
                />
              )
            })}
          </div>

          {/* 우측: 이미지 풀 (전체 + 검색/필터/뷰모드/아코디언) */}
          <ImagePool
            allImages={folderImages}
            usedFiles={usedFiles}
            fileBookMap={fileBookMap}
            fileFieldMap={fileFieldMap}
            view={view}
            imageBaseUrl={imageBaseUrl}
            bookTitles={allBooks.map((b: any) => b?.title ?? '')}
            onLocate={state.locateImage}
            onDrop={fn => dropImage(0, fn)}
            onDelete={async fn => {
              await fetch(`/api/${series}/images/${name}/${fn}`, { method: 'DELETE' })
              onUpdate(stripImageRefs(episode, fn))
              refreshFolderImages()
            }}
            onOpenFolder={() => fetch(`/api/${series}/images/${name}`, { method: 'POST' })}
            onOpenFolderPath={folder => fetch(`/api/${series}/images/${name}/${folder}`, { method: 'POST' })}
            onRefresh={refreshFolderImages}
            crossUsage={crossUsage}
            subFolders={subFolders}
            fileFolders={fileFolders}
            duplicates={duplicates}
            onMoveFile={moveFileToFolder}
            onCreateFolder={createFolder}
            onRenameFolder={renameFolder}
            onDeleteFolder={deleteFolder}
          />
        </div>
      )}
    </div>
  )
}
