'use client'

import { useState } from 'react'
import { type FactionScript, type FactionLongformItem, type FactionChapter, type FactionNarratorVoice, type FactionPerson } from '../../../lib/faction-types'
import type { VoiceFile } from '@feelandnote/shared/bo/voice-utils'
import type { EditLang } from '@feelandnote/shared/bo/editor'
import { totalPeople, totalSec, longformPartCount, longformSegments, longformSliceGroup, ERA_SEC, CHAPTER_BLACK_SEC, chapterCoverSecOf } from '../shared/timing'
import { stripCommonNarrationVoice, vnChapterTitle } from '@/lib/faction-voice'
import { useFactionVoice } from '../shared/FactionVoiceContext'
import { formatMmss } from '@feelandnote/shared/bo/editor'
import { FactionMusicPicker } from '../shared/FactionMusicPicker'
import { PartTextField } from './sections/PartTextField'
import { CoverPickerButton } from './FactionGroupEditor/CoverPickerButton/CoverPickerButton'
import { FactionVoicePanel } from './FactionGroupEditor/FactionPersonRow/FactionVoicePanel/FactionVoicePanel'
import { FactionVoiceSettingsModal } from './FactionGroupEditor/FactionPersonRow/FactionVoicePanel/voice-panel/FactionVoiceSettingsModal'
import { QUOTE_SLOT } from './FactionGroupEditor/FactionPersonRow/FactionVoicePanel/voice-panel/voice-slots'
import { FactionHeroPicker, type HeroCandidate } from './FactionHeroPicker'

/** 세력 색 위 글자색 — 밝으면 검정, 어두우면 흰색 */
function contrast(hex?: string): string {
  const h = (hex ?? '#92400e').replace('#', '')
  if (h.length < 6) return '#ffffff'
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16)
  return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? '#1a1a1a' : '#ffffff'
}

const head = (s?: string) => (s ?? '').split('\n')[0]?.trim() ?? ''

/**
 * 롱폼 편성 패널 — 쇼츠 편성(편1·편2)과 별개로 롱폼 전용 순서를 직접 짠다.
 * 세력 블록을 위/아래로 옮겨 원하는 순서로 배치하고,
 * 사이사이 「시대 문구」·「편 경계」를 끼운다. 사건 화면 자체는 정비 탭에서 그룹에 붙인다.
 * 편 경계를 꽂으면 롱폼이 그 지점에서 여러 편(1편·2편…)으로 갈라지고, 편별 명칭·시작문구를 따로 둘 수 있다.
 * 비워두면(직접 배치 안 함) 롱폼은 세력 카드 배열 순서를 그대로 따른다.
 */
export function FactionLongformPanel({
  script,
  series,
  episodeName,
  onChange,
  onJump,
  musicList,
  musicLabel,
  editLang,
}: {
  script: FactionScript
  series: string
  episodeName: string
  onChange: (patch: Partial<FactionScript>) => void
  onJump: (groupIndex: number) => void
  musicList: string[]
  musicLabel?: (file: string) => string
  editLang: EditLang
}) {
  const voiceCtx = useFactionVoice()
  const [chapterVoiceOpen, setChapterVoiceOpen] = useState<number | null>(null)
  const layout: FactionLongformItem[] = script.longformLayout ?? []
  const active = script.groups.map((g, i) => ({ g, i })).filter(x => !x.g.disabled)
  const heroCandidates = Array.from(new Map(
    script.groups.flatMap(group => [
      ...(group.people ?? []),
      ...(group.clusters ?? []).flatMap(cluster => cluster.people ?? []),
    ])
      .filter(person => !!person.slug)
      .map(person => [person.slug as string, {
        slug: person.slug as string,
        name: person.name,
        image: person.image,
      } satisfies HeroCandidate]),
  ).values())

  const setLayout = (next: FactionLongformItem[]) =>
    onChange({ longformLayout: next.length ? next : undefined })
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir
    if (j < 0 || j >= layout.length) return
    const next = [...layout]
    ;[next[i], next[j]] = [next[j], next[i]]
    setLayout(next)
  }
  const removeAt = (i: number) => setLayout(layout.filter((_, k) => k !== i))
  const addGroup = (gi: number) => setLayout([...layout, { group: gi }])
  const addEra = () => setLayout([...layout, { era: { label: '시대\n문구' } }])
  const addCut = () => setLayout([...layout, { cut: true }])
  const addChapter = () => setLayout([...layout, { chapter: { title: '챕터 2\n부제' } }])
  const setEra = (i: number, label: string) =>
    setLayout(layout.map((it, k) => (k === i && 'era' in it ? { era: { ...it.era, label } } : it)))
  // 챕터 전환 한 항목 필드 갱신 — 제목·미디어·곡·효과음
  const setChapter = (i: number, patch: Partial<FactionChapter>) =>
    setLayout(layout.map((it, k) => (k === i && 'chapter' in it ? { chapter: { ...it.chapter, ...patch } } : it)))

  const chapterPerson = (chapter: FactionChapter, title: string) => {
    const {
      quote: _quote,
      quoteEn: _quoteEn,
      quoteChunks: _quoteChunks,
      quoteEnChunks: _quoteEnChunks,
      quoteDuration: _quoteDuration,
      ...common
    } = script.narrator?.logline ?? {}
    return { ...common, ...(chapter.voice ?? {}), quote: title, name: '챕터명 낭독' }
  }
  const activeChapterFile = (file: string): VoiceFile | undefined => {
    const meta = voiceCtx?.byFile.get(file)
    return meta ? { name: file, sizeKB: Math.round(meta.size / 1024), duration: meta.duration, engine: 'gemini' } : undefined
  }

  // 편 경계(cut) 유무·편 개수 — 경계가 있으면 롱폼이 여러 편으로 갈라진다
  const lvCount = longformPartCount(script)
  const hasCut = lvCount > 1
  // 편별 길이 추정 — 구간의 세력만 모아 기존 추정 함수 재사용 + 시대 문구 카드 시간
  const segments = longformSegments(script)
  const lvPartSec = (p: number): number => {
    const steps = segments[p - 1] ?? []
    const gs = steps.flatMap(s => {
      if (!('gi' in s)) return []
      const group = longformSliceGroup(script, s)
      return group ? [group] : []
    })
    const eraN = steps.filter(s => 'era' in s).length
    const chapterSec = steps
      .filter((s): s is { chapter: FactionChapter } => 'chapter' in s)
      .reduce((sum, s) => sum + CHAPTER_BLACK_SEC + chapterCoverSecOf(script, s.chapter), 0)
    return totalSec({ ...script, groups: gs }) + eraN * ERA_SEC + chapterSec
  }

  // 직접 배치 시작 — 현재 활성 세력을 배열 순서대로 깔아준다.
  const initFromGroups = () => setLayout(active.map(x => ({ group: x.i })))

  // 배치에 든 세력 인덱스 / 아직 안 든 활성 세력
  const placed = new Set(layout.flatMap(it => ('group' in it ? [it.group] : [])))
  const unplaced = active.filter(x => !placed.has(x.i))

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="flex items-center gap-3 bg-bg-card px-4 py-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-amber-500/20 text-sm font-bold text-amber-500">롱</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="shrink-0 text-base font-bold text-text-primary">롱폼 편성</span>
            <span className="truncate text-[11px] text-text-dim">{layout.length ? '롱폼 세력 순서·시대 문구·편 경계' : '직접 편성 안 함 — 정비의 세력 순서와 개별 장면을 그대로 따른다'}</span>
          </div>
        </div>
        <span className="ml-auto flex shrink-0 items-center gap-2 text-xs text-text-dim">
          <span>세력 {active.length}</span>
          <span>인물 {totalPeople(script)}</span>
          <span className="font-mono">{formatMmss(totalSec(script))}</span>
        </span>
      </div>

      <div className="space-y-2 border-t border-border bg-bg-main/20 p-3">
        {/* 롱폼 전용 시작·종료 화면 — 비우면 쇼츠와 같은 화면(공용 introImage/outroImage)이 나간다. 여기에 넣으면 롱폼만 다른 화면(영상 mp4 가능). */}
        <div className="space-y-1.5 rounded-md border border-amber-500/40 bg-amber-500/5 p-2.5">
          <div className="text-[11px] font-bold text-amber-600">롱폼 전용 시작·종료 화면</div>
          <div className="flex flex-wrap items-start gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-text-dim">시작 화면 (롱폼)</span>
              <CoverPickerButton
                value={script.introImageLong}
                onChange={next => onChange({ introImageLong: next })}
                label="시작 화면"
                emptyText="쇼츠와 동일"
                series={series}
                episodeName={episodeName}
                className="h-28 w-48"
              />
              <span className="w-48 text-[10px] leading-tight text-text-dim">비우면 쇼츠 시작 화면과 동일하게 나갑니다. 영상(mp4)도 넣을 수 있습니다</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-text-dim">종료 화면 (롱폼)</span>
              <CoverPickerButton
                value={script.outroImageLong}
                onChange={next => onChange({ outroImageLong: next })}
                label="종료 화면"
                emptyText="쇼츠와 동일"
                series={series}
                episodeName={episodeName}
                className="h-28 w-48"
              />
              <span className="w-48 text-[10px] leading-tight text-text-dim">비우면 쇼츠 종료 화면과 동일하게 나갑니다. 영상(mp4)도 넣을 수 있습니다</span>
            </div>
            
            <div className="flex flex-col gap-1 ml-4 border-l border-amber-500/20 pl-4">
              <span className="text-xs text-text-dim">LV 썸네일 (롱폼 전용)</span>
              <CoverPickerButton
                value={script.lvThumbnailImage}
                onChange={next => onChange({ lvThumbnailImage: next })}
                label="LV 썸네일"
                emptyText="첫 번째 인물"
                series={series}
                episodeName={episodeName}
                className="h-28 w-48"
              />
              <span className="w-48 text-[10px] leading-tight text-text-dim">롱폼 세로 썸네일에 띄울 핵심 이미지를 넣습니다. 미지정 시 첫 번째 인물 사진.</span>
            </div>
          </div>
        </div>

        {layout.length === 0 && !hasCut ? (
          <button onClick={initFromGroups} className="w-full rounded-md border border-dashed border-amber-500/60 px-3 py-2 text-xs font-bold text-amber-600 hover:bg-amber-500/10">
            직접 배치 시작 — 현재 세력 순서로 깔기
          </button>
        ) : (
          <>
            {/* 롱폼 순서 — 세력·전환 카드를 위/아래로 옮긴다. 개별 장면 자체는 정비에서 관리한다. */}
            <div className="flex flex-col gap-1">
              {/* 경계가 있으면 맨 앞에 1편 라벨 — 어느 편에 속하는지 한눈에 */}
              {hasCut && (
                <div className="px-1 text-[10px] font-bold text-sky-600">1편 · {formatMmss(lvPartSec(1))}</div>
              )}
              {layout.map((it, i) => {
                if ('cut' in it) {
                  // 이 경계까지의 cut 수 + 1 = 경계 뒤에 시작하는 편 번호
                  const partNo = layout.slice(0, i + 1).filter(x => 'cut' in x).length + 1
                  return (
                    <div key={i} className="flex items-center gap-1.5 rounded border border-dashed border-sky-500/60 bg-sky-500/10 px-2 py-1">
                      <span className="h-px flex-1 bg-sky-500/40" />
                      <span className="shrink-0 text-[10px] font-bold text-sky-600">
                        편 경계 — 여기서 {partNo}편 시작 · {formatMmss(lvPartSec(partNo))}
                      </span>
                      <span className="h-px flex-1 bg-sky-500/40" />
                      <MoveBtns onUp={() => move(i, -1)} onDown={() => move(i, 1)} onRemove={() => removeAt(i)} />
                    </div>
                  )
                }
                if ('era' in it) {
                  return (
                    <div key={i} className="flex items-center gap-1.5 rounded border-l-2 border-amber-500 bg-amber-500/10 px-2 py-1">
                      <span className="shrink-0 text-[10px] font-bold text-amber-600">시대 문구</span>
                      <textarea
                        value={it.era.label}
                        onChange={e => setEra(i, e.target.value)}
                        rows={2}
                        placeholder={'4강\n패권을 다투다'}
                        className="min-w-0 flex-1 resize-none rounded border border-border bg-bg-card px-2 py-1 text-xs leading-tight focus:border-accent focus:outline-none"
                        title="시대 문구 (첫 줄=앞부분/크게, 둘째 줄=뒷부분/강조색)"
                      />
                      <MoveBtns onUp={() => move(i, -1)} onDown={() => move(i, 1)} onRemove={() => removeAt(i)} />
                    </div>
                  )
                }
                if ('chapter' in it) {
                  const a = it.chapter
                  const titleVal = editLang === 'en' ? (a.titleEn ?? '') : a.title
                  const chapterFile = vnChapterTitle(titleVal)
                  const chapterMeta = voiceCtx?.byFile.get(chapterFile)
                  const chapterActiveFile = activeChapterFile(chapterFile)
                  const person = chapterPerson(a, titleVal) as FactionPerson
                  const narrated = a.narrate ?? script.narrator?.readChapterTitle ?? false
                  return (
                    <div key={i} className="space-y-1.5 rounded border-l-2 border-purple-500 bg-purple-500/10 px-2 py-2">
                      <div className="flex items-start gap-1.5">
                        <span className="shrink-0 pt-1 text-[10px] font-bold text-purple-500">챕터 전환</span>
                        <textarea
                          value={titleVal}
                          onChange={e => setChapter(i, editLang === 'en' ? { titleEn: e.target.value } : { title: e.target.value })}
                          rows={2}
                          placeholder={'챕터 2\n감시에 맞서다'}
                          className="min-w-0 flex-1 resize-none rounded border border-border bg-bg-card px-2 py-1 text-xs leading-tight focus:border-accent focus:outline-none"
                          title="챕터 제목 (첫 줄=챕터 표식/크게, 둘째 줄=부제/강조색)"
                        />
                        <MoveBtns onUp={() => move(i, -1)} onDown={() => move(i, 1)} onRemove={() => removeAt(i)} />
                      </div>
                      <label className="inline-flex items-center gap-1.5 text-[11px] text-text-secondary">
                        <input
                          type="checkbox"
                          checked={narrated}
                          onChange={e => setChapter(i, { narrate: e.target.checked })}
                        />
                        팩션 낭독 음성으로 챕터명 읽기
                      </label>
                      {/* 읽기를 꺼도 이미 만들어 둔 음원이 있으면 그대로 드러낸다 — 껐다는 이유로 사라지면 다시 만들 수밖에 없다 */}
                      {voiceCtx && titleVal.trim() && (narrated || !!chapterMeta) && (
                        <FactionVoicePanel
                          person={person}
                          series={series}
                          episodeName={episodeName}
                          voiceFile={chapterFile}
                          hasContent
                          meta={chapterMeta}
                          activeFile={chapterActiveFile}
                          onOpenModal={() => setChapterVoiceOpen(i)}
                          slot={{ ...QUOTE_SLOT, label: '챕터명 낭독', hasSync: false }}
                        />
                      )}
                      <input
                        value={a.media ?? ''}
                        onChange={e => setChapter(i, { media: e.target.value || undefined })}
                        placeholder="배경 이미지·영상 경로 (예: _chapters/ch2.mp4)"
                        className="w-full rounded border border-border bg-bg-card px-2 py-1 text-[11px] focus:border-accent focus:outline-none"
                        title="챕터 표지 배경 미디어 — 이미지 또는 영상(mp4). 시작·종료 화면과 같은 경로 규칙"
                      />
                      <div className="flex items-center gap-2">
                        <span className="w-8 shrink-0 text-[10px] text-text-dim">챕터 곡</span>
                        <FactionMusicPicker
                          file={a.music}
                          vol={a.musicVolume}
                          musicList={musicList}
                          label={musicLabel}
                          onFile={v => setChapter(i, { music: v })}
                          onVol={v => setChapter(i, { musicVolume: v })}
                        />
                      </div>
                      <input
                        value={a.sfx ?? ''}
                        onChange={e => setChapter(i, { sfx: e.target.value || undefined })}
                        placeholder="전환 효과음 파일 (예: chapter-break.wav)"
                        className="w-full rounded border border-border bg-bg-card px-2 py-1 text-[11px] focus:border-accent focus:outline-none"
                        title="검정 브릿지 진입 시 1회 울리는 효과음 (public/common/sfx/ 하위)"
                      />
                      {chapterVoiceOpen === i && (
                        <FactionVoiceSettingsModal
                          person={person}
                          onChange={next => {
                            const { name: _name, ...rest } = next as FactionPerson & { name?: string }
                            setChapter(i, {
                              voice: stripCommonNarrationVoice(rest as FactionNarratorVoice, script.narrator?.logline),
                            })
                          }}
                          series={series}
                          episodeName={episodeName}
                          voiceFile={chapterFile}
                          activeFile={chapterActiveFile}
                          onRefresh={() => voiceCtx?.reload?.()}
                          onClose={() => setChapterVoiceOpen(null)}
                          slot={{ ...QUOTE_SLOT, label: '챕터명 낭독', hasSync: false }}
                        />
                      )}
                    </div>
                  )
                }
                const g = script.groups[it.group]
                const color = g?.color ?? '#92400e'
                return (
                  <div key={i} className="flex items-center gap-1.5">
                    <button
                      onClick={() => onJump(it.group)}
                      className="flex min-w-0 flex-1 items-center gap-2 rounded px-2 py-1 text-left hover:brightness-110 hover:ring-2 hover:ring-white/30"
                      style={{ backgroundColor: color, color: contrast(color) }}
                      title={g ? `${head(g.name)}로 이동` : '없는 세력'}
                    >
                      <span className="shrink-0 text-[10px] opacity-70">세력</span>
                      <span className="min-w-0 truncate text-xs font-bold">{g ? head(g.name) : `(삭제된 세력 #${it.group})`}</span>
                    </button>
                    <MoveBtns onUp={() => move(i, -1)} onDown={() => move(i, 1)} onRemove={() => removeAt(i)} />
                  </div>
                )
              })}
            </div>

            {/* 추가 도구 — 롱폼 전환 카드 / 안 든 세력 */}
            <div className="flex flex-wrap items-center gap-1.5 border-t border-border/60 pt-2">
              <button onClick={addEra} className="rounded border border-amber-500/60 px-2 py-1 text-[11px] font-bold text-amber-600 hover:bg-amber-500/10">+ 시대 문구</button>
              <button onClick={addCut} title="편 경계 — 롱폼을 이 지점에서 다음 편으로 가른다 (각 편은 자체 시작·종료 화면)" className="rounded border border-sky-500/60 px-2 py-1 text-[11px] font-bold text-sky-600 hover:bg-sky-500/10">+ 편 경계</button>
              <button onClick={addChapter} title="챕터 전환 — 한 영상 안에서 다음 챕터로 넘긴다. 검정 브릿지 + 챕터 표지(배경 미디어 + 챕터 제목), 이 지점에서 배경음악도 새 곡으로 교체" className="rounded border border-purple-500/60 px-2 py-1 text-[11px] font-bold text-purple-500 hover:bg-purple-500/10">+ 챕터 전환</button>
              {unplaced.length > 0 && <span className="text-[11px] text-text-dim">안 든 세력:</span>}
              {unplaced.map(x => (
                <button
                  key={x.i}
                  onClick={() => addGroup(x.i)}
                  className="rounded px-2 py-0.5 text-[11px] font-bold hover:brightness-110"
                  style={{ backgroundColor: x.g.color ?? '#92400e', color: contrast(x.g.color) }}
                  title={`${head(x.g.name)} 추가`}
                >
                  + {head(x.g.name)}
                </button>
              ))}
            </div>

            {/* 편별 설정 — 경계가 있을 때만. 각 롱폼 편의 영상 명칭·시작문구(비우면 공통 값) */}
            {hasCut && (
              <div className="space-y-2 border-t border-border/60 pt-2">
                <div className="text-[10px] font-semibold text-text-dim">롱폼 편별 설정 — 편 경계로 가른 각 편의 명칭·시작문구·핵심 인물 (비우면 공통)</div>
                {Array.from({ length: lvCount }, (_, k) => k + 1).map(p => (
                  <div key={p} className="space-y-2 rounded-md border border-border/60 bg-bg-card/30 p-2.5">
                    <div className="flex items-baseline gap-2">
                      <span className="text-[11px] font-bold text-sky-600">롱폼 {p}편</span>
                      <span className="font-mono text-[10px] text-text-dim">{formatMmss(lvPartSec(p))}</span>
                    </div>
                    <PartTextField part={p} label="영상 명칭" keys={{ common: 'title', byPart: 'titleByLvPart' }} multiline script={script} update={onChange} editLang={editLang} />
                    <PartTextField part={p} label="시작문구" keys={{ common: 'logline', byPart: 'loglineByLvPart' }} multiline multilineHint="시작문구 (개행하면 위·아래 두 줄)" script={script} update={onChange} editLang={editLang} />
                    <FactionHeroPicker
                      script={{ ...script, heroesByPart: script.heroesByLvPart }}
                      candidates={heroCandidates}
                      series={series}
                      episodeName={episodeName}
                      part={p}
                      onChange={patch => {
                        if ('heroesByPart' in patch) onChange({ heroesByLvPart: patch.heroesByPart })
                        else onChange(patch)
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* 롱폼 배경음악 안내 — 곡은 챕터 단위로 흐른다. 첫 챕터(시작) 곡은 정보 탭의 전역 배경음악, 이후 챕터 곡은 각 챕터 전환에서 지정한다. */}
        <div className="border-t border-border/60 pt-2 text-[10px] leading-relaxed text-text-dim">
          롱폼 배경음악은 챕터 단위로 흐른다. 첫 챕터(시작) 곡은 정보 탭의 전역 배경음악에서 정하고, 이후 챕터의 곡은 각 「챕터 전환」 항목에서 지정한다. 챕터 전환 지점에서 이전 곡을 닫고 잠시 숨을 고른 뒤 새 곡을 연다.
        </div>
      </div>
    </div>
  )
}

/** 한 항목의 위/아래 이동 + 삭제 버튼 묶음 */
function MoveBtns({ onUp, onDown, onRemove }: { onUp: () => void; onDown: () => void; onRemove: () => void }) {
  const cls = 'rounded border border-border px-1.5 py-1 text-[11px] leading-none text-text-secondary hover:bg-bg-hover'
  return (
    <div className="flex shrink-0 items-center gap-1">
      <button onClick={onUp} className={cls} title="위로">▲</button>
      <button onClick={onDown} className={cls} title="아래로">▼</button>
      <button onClick={onRemove} className={`${cls} text-text-dim`} title="빼기">✕</button>
    </div>
  )
}
