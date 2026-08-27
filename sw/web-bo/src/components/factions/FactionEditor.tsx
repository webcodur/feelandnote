'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import type { FactionGroup, FactionPerson, HoldMotion } from '@/lib/faction-types'
import { HOLD_MOTION_OPTIONS } from './shared/holdMotion'
import { totalSec, cueCount } from './shared/timing'
import {
  FloatingSaveButton, type EditLang,
} from '@feelandnote/shared/bo/editor'

import { ImagePool, FACTION_IMAGE_DND } from '@feelandnote/shared/bo/media'
import FactionEpisodeActions from './FactionEpisodeActions'
import { FactionEditorHeader } from './FactionEditor/sections/FactionEditorHeader'
import { FactionProjectSettings } from './FactionEditor/sections/FactionProjectSettings'
import { FactionMusicSettings } from './FactionEditor/sections/FactionMusicSettings'
import { FactionToolDock } from './FactionEditor/sections/FactionToolDock'
import { FactionInfoPanel } from './FactionEditor/sections/FactionInfoPanel'
import { FactionShortsPanel } from './FactionEditor/sections/FactionShortsPanel'
import { useFactionMedia } from './FactionEditor/hooks/useFactionMedia'
import { useFactionProductionActions } from './FactionEditor/hooks/useFactionProductionActions'
import { useFactionGroupActions } from './FactionEditor/hooks/useFactionGroupActions'
import { useFactionScriptDocument } from './FactionEditor/hooks/useFactionScriptDocument'
import { collectUsedImages } from './shared/usedImages'
import { TaskPanel } from '@/components/TaskPanel'
import { FactionVoiceProvider } from './shared/FactionVoiceContext'
import { FactionAtlasProvider } from './shared/FactionAtlasContext'
import { FactionQuoteModeModal } from './FactionEditor/FactionQuoteModeModal'
import type { HeroCandidate } from './FactionEditor/FactionHeroPicker'
import { FactionYouTubePanel } from './FactionEditor/FactionYouTubePanel'
import { FactionPublishPanel } from './FactionPublishPanel'
import { FactionEffectsSheet } from './FactionEditor/FactionEffectsSheet'
import { useImagePoolToggle } from '@/lib/useImagePoolToggle'
import { FactionCardPanel } from './FactionEditor/FactionCardPanel'
import type { FactionCardInitialTarget } from './FactionEditor/FactionCardPanel/utils'
import { FactionLongformPanel } from './FactionEditor/FactionLongformPanel'
import { FactionPersonMoveModal } from './FactionEditor/FactionPersonMoveModal'
import type { FactionEditTab } from '@/lib/faction-edit-route'
import { useCelebExists } from '@/lib/useCelebExists'
import { folderToParam } from '@/lib/faction-edit-route'
import { materializeFactionSceneVoiceFiles } from './FactionEditor/FactionGroupEditor/faction-speaker-edit'

/** 편집 화면 주소 뿌리 — 목록도 상세도 이 아래에 있다 */
const EDIT_BASE = '/factions'

export function FactionEditor({ series, name, initialLang, initialTab = 'info', cardTarget }: { series: string; name: string; initialLang?: EditLang; initialTab?: FactionEditTab; cardTarget?: FactionCardInitialTarget }) {
  // 이미지 풀 — 정비 본문 폭을 우선하고 필요할 때 도구막대·Ctrl+Q로 연다.
  const { open: showPool, setOpen: setShowPool } = useImagePoolToggle({ defaultOpen: false })
  const [showYouTube, setShowYouTube] = useState(false)
  const [showPublish, setShowPublish] = useState(false)
  const [quoteModeOpen, setQuoteModeOpen] = useState(false)
  const [effectsOpen, setEffectsOpen] = useState(false)
  // 편 묶음(공통·1편…N편) 접기 상태 — key=묶음 번호
  const [collapsedParts, setCollapsedParts] = useState<Record<number, boolean>>({})
  // 편집 언어 — 입력칸의 노출 언어를 한국어/영어/둘 다로 가린다(하위 입력칸 전체가 따른다)
  const [editLang, setEditLang] = useState<EditLang>(initialLang ?? 'ko')
  const [showCards, setShowCards] = useState(false)
  // 정비 화면 안의 에피소드 전체 인물 사진 모드. URL은 /info를 유지하고 이미지 풀과 나란히 쓴다.
  const [showPeopleImages, setShowPeopleImages] = useState(false)
  // 편집 탭 — 정비(info) / 편성 쇼츠(shorts) / 편성 롱폼(longform). 주소창 both/<탭> 과 짝을 이룬다.
  const [tab, setTab] = useState<FactionEditTab>(initialTab)
  // 편성 안에서 마지막으로 본 하위(쇼츠/롱폼) — 최상위 '편성'을 다시 누르면 이 화면으로 돌아간다
  const [composeSub, setComposeSub] = useState<'shorts' | 'longform'>(initialTab === 'longform' ? 'longform' : 'shorts')
  const appliedCardTargetOpen = useRef(false)

  useEffect(() => {
    if (appliedCardTargetOpen.current) return
    if (cardTarget) {
      setShowCards(true)
      appliedCardTargetOpen.current = true
    }
  }, [cardTarget])

  const infoPath = `${EDIT_BASE}/${folderToParam(name)}/${editLang}/info`
  const cardBoardPath = `${infoPath}/card`
  const toggleCards = useCallback(() => {
    const nextOpen = !showCards
    window.history.pushState(null, '', nextOpen ? cardBoardPath : infoPath)
    setShowPeopleImages(false)
    setShowCards(nextOpen)
  }, [showCards, cardBoardPath, infoPath])
  // 탭 전환 — 카드 화면을 닫고 해당 탭 주소로 바꾼다(정비=info / 편성 쇼츠=shorts / 편성 롱폼=longform)
  const goTab = useCallback((next: FactionEditTab) => {
    setShowCards(false)
    setShowPeopleImages(false)
    setTab(next)
    if (next !== 'info') setComposeSub(next)
    window.history.pushState(null, '', `${EDIT_BASE}/${folderToParam(name)}/${editLang}/${next}`)
  }, [name, editLang])

  const togglePeopleImages = useCallback(() => {
    const nextOpen = !(tab === 'info' && showPeopleImages)
    setShowCards(false)
    setTab('info')
    setShowPeopleImages(nextOpen)
    if (nextOpen) setShowPool(true)
    window.history.pushState(null, '', infoPath)
  }, [infoPath, setShowPool, showPeopleImages, tab])

  const {
    script,
    scriptRef,
    celebVoices,
    atlasReloadKey,
    saveNote,
    dirty,
    saving,
    save,
    reloadScript,
    update,
    replaceScript,
    createFolder,
    deleteFolder,
    moveFile,
    renameFolder,
    deleteFile,
  } = useFactionScriptDocument({
    series,
    episodeName: name,
    setCollapsedParts,
  })

  const {
    musicList,
    sfxList,
    voiceFiles,
    replaceVoiceFiles,
    loadVoices,
    openMusicFolder,
    musicLabel,
    voiceUrl,
    voiceByFile,
    tracks,
    addTrack,
    moveTrack,
    removeTrack,
    setTrackVolume,
  } = useFactionMedia({
    series,
    episodeName: name,
    script,
    scriptRef,
    onChange: update,
  })

  // 구 위치형 음원은 실제 파일을 확인한 뒤 각 대사 항목의 명시 파일로 한 번만 고정한다.
  // 이후 다른 출연 인물이나 장면 데이터를 지워도 이 대사의 음원 연결은 배열 위치를 따라 흔들리지 않는다.
  useEffect(() => {
    if (!script?.groups?.length || !voiceFiles.length) return
    const available = new Map(voiceFiles.map(file => [file.file, file]))
    const materialized = materializeFactionSceneVoiceFiles(script.groups, available)
    if (materialized.changed > 0) update({ groups: materialized.groups })
  }, [script?.groups, voiceFiles, update])

  const {
    rendering,
    syncing,
    regeneratingFile,
    ensureSaved: ensurePublishSaved,
    render,
    generateVoice,
    normalizeVoice,
    regenerateVoice,
    syncVoiceDurations,
  } = useFactionProductionActions({
    series,
    episodeName: name,
    dirty,
    save,
    scriptRef,
    onChange: update,
    loadVoices,
    replaceVoiceFiles,
  })

  const {
    groups,
    crossMoveTarget,
    setGroup,
    setGroupTagSlug,
    deleteGroup,
    moveGroupInPart,
    addGroup,
    moveGroup,
    setGroupPart,
    changeShortsPartCount,
    requestPersonMove,
    closePersonMove,
    confirmPersonMove: movePersonCrossGroup,
    jumpToGroup,
    editGroup,
  } = useFactionGroupActions({
    script,
    series,
    episodeName: name,
    onChange: update,
    loadVoices,
    goTab,
    setCollapsedParts,
  })

  // ── 시작·마무리 화면 인물(heroes) 후보 — slug 있는 인물만(셀럽 DB 연동). 썸네일용 image 포함 ──
  // 같은 순회에서 전 인물 slug도 모아 DB 등록 배지(✓DB/⚠없음/미연결/신화) 배치 대조에 쓴다.
  const scriptGroups = script?.groups
  const { heroCandidates, personSlugs } = useMemo(() => {
    const heroCandidatesBySlug = new Map<string, HeroCandidate>()
    const slugs: (string | undefined)[] = []
    for (const g of scriptGroups ?? []) {
      // 세력 로고도 시작 화면에 넣을 수 있게 후보로 — slug 'logo:<이미지>' 로 식별. 영상 로고(logoVid) 없으면 이미지 로고(logoImg) 사용
      const logoImg = g.logoVid ?? g.logoImg
      if (logoImg) {
        const slug = `logo:${logoImg}`
        if (!heroCandidatesBySlug.has(slug)) {
          heroCandidatesBySlug.set(slug, { slug, name: `${g.name} 로고`, image: logoImg })
        }
      }
      if (g.clusters?.length) {
        for (const cluster of g.clusters) {
          for (const p of cluster.people) {
            if (p.isPerson === false) continue
            slugs.push(p.slug)
            if (p.slug && !heroCandidatesBySlug.has(p.slug)) {
              const inheritsGroupImage = !g.solo && !!cluster.image && (!p.image || p.image === cluster.image)
              heroCandidatesBySlug.set(p.slug, {
                slug: p.slug,
                name: p.name,
                image: inheritsGroupImage ? cluster.image : p.image,
              })
            }
          }
        }
      } else {
        for (const p of g.people) {
          if (p.isPerson === false) continue
          slugs.push(p.slug)
          if (p.slug && !heroCandidatesBySlug.has(p.slug)) {
            heroCandidatesBySlug.set(p.slug, { slug: p.slug, name: p.name, image: p.image })
          }
        }
      }
    }
    return { heroCandidates: [...heroCandidatesBySlug.values()], personSlugs: slugs }
  }, [scriptGroups])
  // 배지가 참조하는 대조 결과 — 담화(useCelebExists)와 같은 창구·판정 규칙
  const celeb = useCelebExists(personSlugs)

  const editorMetrics = useMemo(() => script ? {
    durationSec: totalSec(script),
    cutCount: cueCount(script),
  } : { durationSec: 0, cutCount: 0 }, [script])
  // 이미지 풀을 닫아 둔 평상시에는 전 대본의 이미지 경로를 순회하지 않는다.
  const usedImages = useMemo(
    () => showPool ? collectUsedImages(script) : new Set<string>(),
    [script, showPool],
  )

  if (!script) return <div className="p-6 text-text-dim">불러오는 중...</div>

  // 지속 효과 일괄 적용 — 세력·인물의 개별 지속효과 설정을 모두 비운다(전역값 하나로 통일되게).
  const stripHold = (g: FactionGroup): FactionGroup => ({
    ...g,
    holdMotion: undefined,
    people: g.people.map(p => ({ ...p, holdMotion: undefined })),
    clusters: g.clusters?.map(c => ({ ...c, people: c.people.map(p => ({ ...p, holdMotion: undefined })) })),
  })
  // 모두 끄기 — 개별 설정 제거 + 전역 '정지'. (레거시 transition 줌 승계까지 차단해 전부 멈춘다)
  const bulkClearHold = () => {
    if (!confirm('모든 인물의 지속 효과를 끄고 정지로 통일합니다. 개별 설정은 지워집니다. 계속할까요?')) return
    update({ groups: groups.map(stripHold), holdMotion: 'none' })
  }
  // 전체 통일 덮어쓰기 — 개별 설정 제거 + 전역값으로 통일 + 전역 정지 스위치(noZoom) 해제.
  const bulkApplyHold = (m: HoldMotion) => {
    const label = HOLD_MOTION_OPTIONS.find(o => o.value === m)?.label ?? m
    if (!confirm(`모든 인물의 지속 효과를 "${label}"(으)로 덮어씁니다. 개별 설정은 지워집니다. 계속할까요?`)) return
    update({ groups: groups.map(stripHold), holdMotion: m, noZoom: undefined })
  }

  // 대사 표시 일괄값은 인물 신원이 계속 소유한다. 장면 beat가 그 인물로 할당되면 같은 값을 상속한다.
  const mapAllPeople = (fn: (person: FactionPerson) => FactionPerson): FactionGroup[] =>
    groups.map(group => ({
      ...group,
      people: (group.people ?? []).map(person => person.isPerson === false ? person : fn(person)),
      clusters: group.clusters?.map(cluster => ({
        ...cluster,
        people: (cluster.people ?? []).map(person => person.isPerson === false ? person : fn(person)),
      })),
    }))
  const bulkClearQuoteDisplay = () => {
    if (!confirm('모든 인물의 대사 표시 개별 설정을 지웁니다. 이후 에피소드 기본값만 따릅니다. 계속할까요?')) return
    update({
      groups: mapAllPeople(person => {
        const next = { ...person }
        delete next.quoteDisplay
        delete next.quoteCaptionPos
        delete next.quoteCaptionSize
        delete next.quoteCaptionFont
        return next
      }),
    })
  }
  const bulkStampQuoteDisplay = () => {
    const display = script.quoteDisplay ?? 'box'
    const position = script.quoteCaptionPos ?? 'bottom'
    const size = script.quoteCaptionSize ?? 'default'
    const font = script.quoteCaptionFont ?? 'default'
    if (!confirm(`모든 인물의 대사 표시를 "${display === 'caption' ? '작은 자막' : '박스'}"(으)로 덮어씁니다. 계속할까요?`)) return
    update({
      groups: mapAllPeople(person => ({
        ...person,
        quoteDisplay: display,
        quoteCaptionPos: display === 'caption' ? position : undefined,
        quoteCaptionSize: display === 'caption' ? size : undefined,
        quoteCaptionFont: display === 'caption' ? font : undefined,
      })),
    })
  }

  return (
    <FactionAtlasProvider folder={name} reloadKey={atlasReloadKey}>
    <FactionVoiceProvider value={{
      celebVoices,
      byFile: voiceByFile,
      voiceUrl,
      regenerate: regenerateVoice,
      regeneratingFile,
      reload: loadVoices,
      save,
      episodeName: name,
      series,
      commonNarrationVoice: script.narrator?.logline,
    }}>
    {/* faction-ui — 이 가지 안쪽만 글자·선 보정을 받는다(globals.css 끝 절 참조).
        영상 관리 대시보드의 촘촘한 표가 그 보정에 기대어 읽히도록 짜여 있어 함께 옮겼다. */}
    <div className="faction-ui relative mx-auto max-w-[1800px] pb-16">
      <FactionEditorHeader
        editBase={EDIT_BASE}
        editLang={editLang}
        tab={tab}
        composeSub={composeSub}
        showCards={showCards}
        durationSec={editorMetrics.durationSec}
        cutCount={editorMetrics.cutCount}
        episodeActions={<FactionEpisodeActions folder={name} variant="bar" />}
        onEditLangChange={next => {
          setEditLang(next)
          window.history.pushState(null, '', `${EDIT_BASE}/${folderToParam(name)}/${next}/${showCards ? tab + '/card' : tab}`)
        }}
        onTabChange={goTab}
      />

      <div className="mb-3 space-y-2">
        <FactionToolDock
          script={script}
          peopleImagesActive={tab === 'info' && showPeopleImages}
          poolActive={showPool}
          youtubeActive={showYouTube}
          publishActive={showPublish}
          cardsActive={showCards}
          syncing={syncing}
          rendering={rendering}
          onTogglePeopleImages={togglePeopleImages}
          onTogglePool={() => setShowPool(value => !value)}
          onGenerateVoice={generateVoice}
          onNormalizeVoice={normalizeVoice}
          onOpenQuoteMode={() => setQuoteModeOpen(true)}
          onSyncVoice={syncVoiceDurations}
          onRender={render}
          onToggleYouTube={() => setShowYouTube(value => !value)}
          onTogglePublish={() => setShowPublish(value => !value)}
          onToggleCards={toggleCards}
        />

        {!showCards && !showPeopleImages && (
          <div className="grid items-start gap-2 xl:grid-cols-2">
            <FactionProjectSettings
              script={script}
              editLang={editLang}
              onChange={update}
              onOpenEffects={() => setEffectsOpen(true)}
              onApplyHold={bulkApplyHold}
              onClearHold={bulkClearHold}
            />

            <FactionMusicSettings
              script={script}
              tracks={tracks}
              musicList={musicList}
              videoDurationSec={editorMetrics.durationSec}
              musicLabel={musicLabel}
              onChange={update}
              onAddTrack={addTrack}
              onMoveTrack={moveTrack}
              onRemoveTrack={removeTrack}
              onTrackVolume={setTrackVolume}
              onOpenFolder={openMusicFolder}
            />
          </div>
        )}

        <FloatingSaveButton dirty={dirty} saving={saving} onSave={save} />
        {saveNote && (
          <div className={`fixed bottom-20 right-6 z-50 max-w-sm rounded-lg border px-4 py-3 text-sm shadow-lg ${
            saveNote.warn
              ? 'border-amber-500 bg-amber-500/15 text-amber-500'
              : 'border-border bg-bg-card text-text-secondary'
          }`}>
            {saveNote.text}
          </div>
        )}
      </div>

      {/* 본문 — 편집 화면일 때만 이미지 풀 사이드바를 곁들인다 */}
      <div className={showPool ? 'flex items-start gap-4' : ''}>
        <div className="min-w-0 flex-1">
      {showCards ? (
        <FactionCardPanel
          script={script}
          series={series}
          episodeName={name}
          initialTarget={cardTarget}
        />
      ) : (
        <div className="space-y-5">
          {/* 유튜브 업로드·메타 관리 — 헤더 「유튜브」 버튼으로 펼친다 */}
          {showYouTube && <FactionYouTubePanel series={series} name={name} />}

          {/* 세력도감(본서비스) DB 출간 — 헤더 「출간」 버튼으로 펼친다 */}
          {showPublish && (
            <FactionPublishPanel
              name={name}
              groups={groups}
              onChangeTagSlug={setGroupTagSlug}
              ensureSaved={ensurePublishSaved}
              onDataChanged={reloadScript}
            />
          )}

          {/* 정비 — 세력·장면·대사 항목 데이터 그 자체. */}
          {tab === 'info' && (
            <FactionInfoPanel
              script={script}
              series={series}
              episodeName={name}
              editLang={editLang}
              sfxList={sfxList}
              showPeopleImages={showPeopleImages}
              celebExisting={celeb.existing}
              celebLoaded={celeb.loaded}
              onChange={update}
              onApplyDialogueAll={bulkStampQuoteDisplay}
              onClearDialogueOverrides={bulkClearQuoteDisplay}
              onSetGroup={setGroup}
              onDeleteGroup={deleteGroup}
              onMoveGroup={moveGroup}
              onMovePersonCrossGroup={requestPersonMove}
              onAddGroup={addGroup}
            />
          )}

          {/* 편성 롱폼 — 세력 순서·시대 문구·편 경계를 직접 짠다 */}
          {tab === 'longform' && (
            <FactionLongformPanel
              script={script}
              series={series}
              episodeName={name}
              onChange={update}
              onJump={gi => {
                goTab('info')
                requestAnimationFrame(() => requestAnimationFrame(() =>
                  document.getElementById(`faction-group-${gi}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
                ))
              }}
              musicList={musicList}
              musicLabel={musicLabel}
              editLang={editLang}
            />
          )}

          {tab === 'shorts' && (
            <FactionShortsPanel
              script={script}
              series={series}
              episodeName={name}
              editLang={editLang}
              sfxList={sfxList}
              musicList={musicList}
              musicLabel={musicLabel}
              heroCandidates={heroCandidates}
              collapsedParts={collapsedParts}
              setCollapsedParts={setCollapsedParts}
              onChange={update}
              onChangePartCount={changeShortsPartCount}
              onSetGroupPart={setGroupPart}
              onMoveGroupInPart={moveGroupInPart}
              onEditGroup={editGroup}
              onJumpToGroup={jumpToGroup}
            />
          )}

          {/* 렌더 진행 상황 */}
          <div className="mt-6 border-t border-border pt-4">
            <TaskPanel />
          </div>
        </div>
      )}
        </div>

        {/* 이미지 풀 사이드바 — 편집 화면에서만. main 스크롤 영역의 맨 위에 붙는다. */}
        {showPool && (
          <aside className="sticky top-0 hidden max-h-[calc(100vh-5rem)] w-[24rem] shrink-0 overflow-y-auto rounded-xl border border-border bg-bg-card p-3 xl:block 2xl:w-[28rem] [overflow-anchor:none]">
            <ImagePool
              series={series}
              episodeName={name}
              usedImages={usedImages}
              dnd={FACTION_IMAGE_DND}
              onMoveFile={moveFile}
              onCreateFolder={createFolder}
              onRenameFolder={renameFolder}
              onDeleteFolder={deleteFolder}
              onDeleteFile={deleteFile}
            />
          </aside>
        )}
      </div>

      {/* 좁은 화면: 풀을 본문 아래에 펼침 */}
      {showPool && (
        <div className="mt-6 rounded-xl border border-border bg-bg-card p-3 xl:hidden">
          <ImagePool
            series={series}
            episodeName={name}
            usedImages={usedImages}
            dnd={FACTION_IMAGE_DND}
            onMoveFile={moveFile}
            onCreateFolder={createFolder}
            onRenameFolder={renameFolder}
            onDeleteFolder={deleteFolder}
            onDeleteFile={deleteFile}
          />
        </div>
      )}

      {quoteModeOpen && script && (
        <FactionQuoteModeModal
          script={script}
          series={series}
          episodeName={name}
          onChange={replaceScript}
          onClose={() => setQuoteModeOpen(false)}
        />
      )}
      {/* 움직임 효과 통합 관리 시트 — 전 대상의 전환·시작·지속·줌 목표점·지지직·속도를 한 곳에서 */}
      {effectsOpen && script && (
        <FactionEffectsSheet
          script={script}
          series={series}
          episodeName={name}
          onChange={replaceScript}
          onClose={() => setEffectsOpen(false)}
        />
      )}
      {/* 이동 모달 */}
      {crossMoveTarget && (
        <FactionPersonMoveModal
          groups={groups}
          fromGi={crossMoveTarget.fromGi}
          fromCi={crossMoveTarget.fromCi}
          fromPi={crossMoveTarget.fromPi}
          onClose={closePersonMove}
          onConfirm={movePersonCrossGroup}
        />
      )}
    </div>
    </FactionVoiceProvider>
    </FactionAtlasProvider>
  )
}
