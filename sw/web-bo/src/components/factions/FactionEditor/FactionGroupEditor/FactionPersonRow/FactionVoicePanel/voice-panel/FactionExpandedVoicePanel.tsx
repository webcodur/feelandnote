'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { FactionPerson } from '@/lib/faction-types'
import type { VoiceFile, EleVoiceLike } from '@feelandnote/shared/bo/voice-utils'
import type { GenEngine } from '@feelandnote/shared/bo/voice-utils'
import type { EditLang } from '@feelandnote/shared/bo/editor'
import { DEFAULT_ELE_SEND_OPTS, buildEleText } from '../../../../../../scenario-voice/types'
import {
  SavedVoiceSection, EleEmotionPicker, useVoiceGeneration,
  type VoiceGenEndpoints,
} from '@feelandnote/shared/bo/voice'
import { GenerateSection } from '../../../../../../scenario-voice/ExpandedVoicePanel/sections/GenerateSection'
import { BreathModeContent, type BreathEndpoints } from '../../../../../../scenario-voice/BreathModeContent'
import { AgeModeContent, type AgeEndpoints } from '../../../../../../scenario-voice/AgeModeContent'
import { useFactionVoiceSpec } from './useFactionVoiceSpec'
import { langFieldsOf, voiceLangOf, type FactionVoiceSlot, type FactionVoiceLang } from './voice-slots'
import { voiceGainDbOf } from '@/lib/ele-voice-notes'
import { applyFactionVoiceGain } from '@/actions/admin/factions/voice-gain'
import { FactionSyncContent } from './FactionSyncContent'
import { FactionRateGainControls } from './FactionRateGainControls'
import { EleVoiceCombobox } from './EleVoiceCombobox'
import { buildFactionEleVoiceRecommendations } from './faction-voice-recommendations'
import { useEleVoiceNotes } from './useEleVoiceNotes'
import { useEleVoiceHistory } from './useEleVoiceHistory'
import { folderToParam } from '@/lib/faction-edit-route'

/**
 * 북리커맨드 ExpandedVoicePanel 통째 복제 — 세력도감 인물 1명용.
 *
 * 화면(레이아웃·섹션 구성·버튼·드롭다운·라벨·슬레이트 톤·여백)은 북리커맨드와 동일하다:
 *  - 저장된 음원 섹션(공용 SavedVoiceSection) + 트림.
 *  - 새 음원 생성 섹션(GenerateSection 을 그대로 재사용) — 엔진 토글·캐릭터 보이스·스타일·
 *    입력 텍스트·미리듣기·생성/생성 및 저장 버튼까지 북리커맨드와 픽셀 동일.
 *
 * 세력도감는 단일 대사라 북리커맨드의 SYNC/BREATH 모드(쇼츠 세그먼트 타이밍·들숨 처리)는 없다.
 * 따라서 TRIM 모드 화면만 둔다(북리커맨드도 기본이 TRIM).
 *
 * 데이터만 인물에 맞춰 교체했다:
 *  - 구간 spec → 인물 quote 음성 spec(useFactionVoiceSpec).
 *  - 저장/재생/생성 라우트 → 공용 useVoiceGeneration 에 세력도감 음원 경로(voiceEndpoints)를 넘긴다.
 *
 * 발화 스타일은 인물 quoteStyle 에 영속한다 — 입력칸 blur 시 저장되고, 미리듣기·일괄 생성·렌더가
 * 같은 스타일을 쓴다. ELE 인물은 감정/강도(quoteEleOptions)도 입력받아 미리듣기에 반영한다.
 */

/** 작업 모드 — 'main'(생성·트림) / 'sync'(발화 시각 수동 교정) / 'breath'(들숨 제거) / 'age'(연령 변형). */
export type FactionVoiceMode = 'main' | 'sync' | 'breath' | 'age'

export const FACTION_VOICE_MODE_LABEL: Record<FactionVoiceMode, string> = {
  main: '생성·트림', sync: '싱크 보정', breath: '들숨 제거', age: '연령 변형',
}

type FactionExpandedVoicePanelProps = {
  person: FactionPerson
  onChange: (next: FactionPerson) => void
  series: string
  episodeName: string
  /** 이 인물 음원 파일명 (예 F01P01-quote.wav) */
  voiceFile: string
  /** 저장된 음원 메타(존재·길이) — 없으면 미저장 */
  activeFile: VoiceFile | undefined
  /** 미리듣기/트림 저장 후 음성 목록 재조회 */
  onRefresh: () => void
  /** 음성 슬롯 — 대사(QUOTE_SLOT) 또는 수식어(EPITHET_SLOT) */
  slot: FactionVoiceSlot
  /** 작업 모드 — 모달 헤더의 모드 탭이 소유한다(FactionVoiceSettingsModal). */
  mode: FactionVoiceMode
  /**
   * 편집 언어 — 합성 엔진·ElevenLabs 목소리를 이 언어의 칸에 읽고 쓰고,
   * 셀럽 DB 연동도 이 언어의 목소리(voice_id_ko / voice_id_en)를 다룬다. 미지정이면 국문.
   */
  lang?: EditLang
}

function errText(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

/** 언어 표시 문구 — 버튼·안내에 어느 언어를 다루는 중인지 못박는다 */
const LANG_LABEL: Record<FactionVoiceLang, string> = { ko: '국문', en: '영문' }

// 인물 대사는 한 줄이라 구간키가 따로 없다 — 미리듣기 캐시 키로 인물 파일명을 쓴다.
export function FactionExpandedVoicePanel({
  person, onChange, series, episodeName, voiceFile, activeFile, onRefresh, slot, mode, lang = 'ko',
}: FactionExpandedVoicePanelProps) {
  const secKey = voiceFile
  // 목소리는 한 언어만 고른다 — 「양쪽 함께 보기」는 국문으로 접는다
  const voiceLang: FactionVoiceLang = voiceLangOf(lang)
  const langLabel = LANG_LABEL[voiceLang]

  // error 는 양쪽 hook(spec·생성)이 공유하므로 orchestrator 가 소유한다.
  const [error, setError] = useState<string | null>(null)

  // ElevenLabs 워크스페이스 보이스 목록 — 북리커맨드 화자 선택처럼 드롭다운으로 고른다.
  // 성별·나이·억양 등 꼬리표(labels)와 미리듣기(preview_url)까지 받아 콤보박스에서 거르기·정렬에 쓴다.
  const [eleVoices, setEleVoices] = useState<EleVoiceLike[]>([])
  const [eleVoicesLoading, setEleVoicesLoading] = useState(false)
  const [eleVoicesError, setEleVoicesError] = useState<string | null>(null)
  const eleVoiceNotes = useEleVoiceNotes()
  const eleVoiceHistory = useEleVoiceHistory()
  // 셀럽 DB 연동 — 불변 셀럽 ID(celebId) 우선, 없으면 slug 로 같은 인물을 가리킨다.
  // celebId 가 둘 다 없으면 DB에 등록된 인물이 아니라 연동 불가(버튼 비활성).
  const celebKey = person.celebId || person.slug || null
  const [personGender, setPersonGender] = useState<'male' | 'female' | null>(null)

  // 인물을 되쓰는 콜백은 **전부** 이 ref 를 거친다 — 그리기 시점 인물을 가둬 두면 몇 초 걸리는 작업이
  // 끝날 때 그 사이 사람이 고친 값을 통째로 되돌린다(26.07.26 보이스가 옛 값으로 되돌아가던 사고).
  // 들숨 저장은 처음부터 이 방식이었고, 만들기·저장(onSaved)·연령 변형(onCommitted)도 여기에 맞췄다.
  const personRef = useRef(person)
  personRef.current = person
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  // BreathModeContent 의 로드·저장 라우트를 세력도감 경로로 갈아끼우는 어댑터.
  // (북리커맨드는 /voice/play·/voice/save, 세력도감는 /faction-voice/{episode}/...)
  const breathEndpoints: BreathEndpoints = useMemo(() => ({
    loadUrl: (s, _name, fileName) =>
      `/api/${s}/voice/${folderToParam(episodeName)}/${encodeURIComponent(fileName)}?t=${Date.now()}`,
    save: async (s, _name, fileName, base64) => {
      const res = await fetch(`/api/${s}/voice/${folderToParam(episodeName)}/save`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file: fileName, base64 }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error ?? '저장 실패')
      // 자르기(cut)로 wav 길이가 변한다 — 슬롯 길이 필드를 새 실측 길이로 갱신해야
      // 렌더 컷 길이·재생과 생성·트림 화면 표기가 옛 길이에 머물지 않는다.
      if (typeof data.duration === 'number' && data.duration > 0)
        onChangeRef.current({ ...personRef.current, [slot.fields.duration]: data.duration })
    },
  }), [episodeName, slot])

  // 연령 변형 라우트 — 서버 ffmpeg 로 늙게/젊게 변형. 원본은 voice/ori/ 에 보관.
  const ageEndpoints: AgeEndpoints = useMemo(() => {
    const post = async (s: string, action: string, fileName: string, age: number) => {
      const res = await fetch(`/api/${s}/voice/${folderToParam(episodeName)}/age`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file: fileName, age, action }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error ?? '요청 실패')
      return data
    }
    return {
      loadUrl: (s, _name, fileName) =>
        `/api/${s}/voice/${folderToParam(episodeName)}/${encodeURIComponent(fileName)}?t=${Date.now()}`,
      preview: (s, _name, fileName, age) => post(s, 'preview', fileName, age),
      commit: (s, _name, fileName, age) => post(s, 'commit', fileName, age),
      restore: (s, _name, fileName) => post(s, 'restore', fileName, 0),
      status: (s, _name, fileName) => post(s, 'status', fileName, 0),
    }
  }, [episodeName])

  // 도감에 적힌 이 보이스의 추가 음량 — 인물에 값이 없을 때 재생·미리듣기가 대신 쓴다.
  // 훅을 부르기 전에 인물 데이터에서 직접 읽는다(훅 결과에 기대면 순환한다).
  const assignedVoiceId = person[langFieldsOf(slot, lang).eleVoiceId] as string | undefined
  const usesEle = person[langFieldsOf(slot, lang).engine] === 'elevenlabs'
  const catalogGainDb = usesEle ? voiceGainDbOf(eleVoiceNotes.notes, assignedVoiceId) : undefined

  const spec = useFactionVoiceSpec({
    person, onPersonChange: onChange, slot, lang,
    gainDbFallback: catalogGainDb,
    gainDbOfVoice: id => voiceGainDbOf(eleVoiceNotes.notes, id),
  })
  useEffect(() => {
    if (slot.id !== 'quote' || !celebKey) {
      setPersonGender(null)
      return
    }

    let alive = true
    fetch(`/api/celebs/${encodeURIComponent(celebKey)}/voice`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!alive) return
        setPersonGender(data?.gender === true ? 'male' : data?.gender === false ? 'female' : null)
      })
      .catch(() => { if (alive) setPersonGender(null) })
    return () => { alive = false }
  }, [celebKey, slot.id])

  const eleVoiceRecommendations = useMemo(
    () => buildFactionEleVoiceRecommendations({
      person,
      voices: eleVoices,
      currentVoiceId: spec.eleVoiceId,
      targetGender: slot.id === 'quote' ? personGender : null,
      style: spec.stylePrefix,
      emotions: spec.eleEmotions,
      voiceNotes: eleVoiceNotes.notes,
      voiceHistory: eleVoiceHistory.history,
      blockedVoiceIds: eleVoiceNotes.blockedVoiceIds,
    }),
    [person, eleVoices, spec.eleVoiceId, slot.id, personGender, spec.stylePrefix, spec.eleEmotions, eleVoiceNotes.notes, eleVoiceNotes.blockedVoiceIds, eleVoiceHistory.history],
  )

  // Gemini 발화 스타일 — 인물 quoteStyle(spec.stylePrefix)을 초기값으로 받아 입력칸과 묶는다.
  // 매 키스트로크는 로컬 state 만 갱신하고, blur 시 GenerateSection 이 saveQuoteStyle 로 영속한다.
  const [styleEdit, setStyleEdit] = useState(spec.stylePrefix)
  // 다른 인물로 패널이 바뀌거나 저장값이 갱신되면 입력칸을 인물 quoteStyle 로 동기화.
  useEffect(() => { setStyleEdit(spec.stylePrefix) }, [spec.stylePrefix])

  // ELE 선택 시 보이스 목록을 한 번 불러온다(워크스페이스 등록 보이스 전체).
  useEffect(() => {
    if (spec.chosenEngine !== 'elevenlabs' || eleVoices.length || eleVoicesLoading) return
    setEleVoicesLoading(true)
    setEleVoicesError(null)
    fetch('/api/elevenlabs/voices')
      .then(r => r.json())
      .then(d => { if (Array.isArray(d.voices)) setEleVoices(d.voices); else setEleVoicesError(d.error ?? '목록 로드 실패') })
      .catch(e => setEleVoicesError(String(e)))
      .finally(() => setEleVoicesLoading(false))
  }, [spec.chosenEngine, eleVoices.length, eleVoicesLoading])

  // 현재 선택 보이스의 소속 계정 — 목록에 있으면 생성 API 에 힌트로 넘긴다(계정 오탐 방지).
  const eleAccountId = eleVoices.find(v => v.voice_id === spec.eleVoiceId)?.account?.id ?? null

  // 세력도감 서버 창구 — 인물 음원 파일 하나에 저장·재생하고, 정렬은 백그라운드 작업으로 돌린다.
  // 미리듣기 합성 라우트만 서재 탐방과 같은 경로를 그대로 쓴다.
  const voiceEndpoints: VoiceGenEndpoints = {
    previewUrl: route => `/api/${series}/voice/${route}/preview`,
    save: async (fileName, base64) => {
      const res = await fetch(`/api/${series}/voice/${folderToParam(episodeName)}/save`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file: fileName, base64 }),
      })
      return res.json()
    },
    sourceUrl: fileName =>
      `/api/${series}/voice/${folderToParam(episodeName)}/${encodeURIComponent(fileName)}`,
    analyze: () => fetch(`/api/${series}/voice/${folderToParam(episodeName)}/analyze`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ only: voiceFile, lang: 'ko' }),
    }),
  }

  const gen = useVoiceGeneration({
    endpoints: voiceEndpoints,
    activeFile,
    chosenEngine: spec.chosenEngine,
    styleEdit,
    // 감정 표식·끝 여백은 인물 설정을 따른다. 표식이 하나라도 있어야 켠다.
    buildText: t => buildEleText(t, {
      emotionEnabled: (spec.eleEmotions ?? []).length > 0,
      emotions: spec.eleEmotions ?? [],
      trailEnabled: spec.eleTrail ?? true,
    }),
    // 인물 감정/강도(quoteEleOptions) — 지정한 값만 보내고 나머지는 서버 기본값.
    eleSettings: spec.eleOptions && (typeof spec.eleOptions.stability === 'number' || typeof spec.eleOptions.style === 'number')
      ? { stability: spec.eleOptions.stability, style: spec.eleOptions.style }
      : undefined,
    eleAccountId,
    // 인물 음원은 파일 하나 — 엔진이 달라도 같은 자리에 덮는다.
    targetFile: () => voiceFile,
    error, setError, onRefresh,
    // 저장된 음원 실측 길이를 슬롯 길이 필드(quoteDuration / epithetDuration)에 기록 → 렌더가 컷 길이·재생을 맞춘다.
    // (이 한 줄이 없으면 BO 에서 만든 음원은 길이가 비어 렌더에서 재생되지 않고 컷이 그냥 넘어간다.)
    // ⚠ 만들기·저장은 몇 초 걸린다 — 그 사이 사람이 보이스를 바꿀 수 있으므로 **최신 인물**에 얹는다.
    //   누를 당시 인물을 그대로 되쓰면 그 사이 고친 값이 통째로 되돌아간다(26.07.26 아레스 사고).
    onSaved: dur => onChangeRef.current({ ...personRef.current, [slot.fields.duration]: dur }),
  })

  const [dbBusy, setDbBusy] = useState(false)
  const [dbNotice, setDbNotice] = useState<string | null>(null)
  // 도감 음량을 인물들에게 내려보내는 중인 보이스 + 마지막 결과
  const [gainApplyingId, setGainApplyingId] = useState<string | null>(null)
  const [gainNotice, setGainNotice] = useState<{ ok: boolean; text: string } | null>(null)

  /**
   * 도감 음량 내려보내기 — 먼저 대상 명단을 뽑아 보여주고, 사람이 받아들이면 실제로 적는다.
   * 렌더는 대본 파일의 인물 값만 읽으므로 이 복사를 거쳐야 영상에 반영된다.
   */
  const applyVoiceGain = async (voiceId: string) => {
    const gainDb = voiceGainDbOf(eleVoiceNotes.notes, voiceId)
    const previousGainDb = eleVoiceNotes.previousGainDb[voiceId]
    setGainApplyingId(voiceId)
    setGainNotice(null)
    try {
      const dry = await applyFactionVoiceGain(voiceId, gainDb, previousGainDb, true)
      if (!dry.targets.length) {
        setGainNotice({
          ok: true,
          text: `바꿀 인물이 없다 (이미 같음 ${dry.skipped.unchanged}명 · 따로 맞춰 둠 ${dry.skipped.customized}명)`,
        })
        return
      }
      const preview = dry.targets.slice(0, 12)
        .map(t => `· ${t.name} (${t.folder}) ${t.currentGainDb ?? '없음'} → ${gainDb ?? '없음'}dB`)
        .join('\n')
      const more = dry.targets.length > preview.split('\n').length ? `\n… 외 ${dry.targets.length - 12}명` : ''
      const ok = confirm(
        `이 보이스를 쓰는 인물 ${dry.targets.length}명의 음량을 ${gainDb ?? '없음'}dB 로 맞춥니다.\n`
        + `편 ${dry.folders.join(', ')}\n\n${preview}${more}\n\n`
        + `따로 맞춰 둔 ${dry.skipped.customized}명은 건드리지 않습니다. 계속할까요?`,
      )
      if (!ok) return
      const r = await applyFactionVoiceGain(voiceId, gainDb, previousGainDb, false)
      const failed = r.failures.length ? ` · 실패 ${r.failures.length}건` : ''
      const notWritten = (r.exported ?? []).filter(e => !e.written)
      setGainNotice({
        ok: !r.failures.length && !notWritten.length,
        text: `인물 ${r.applied}명에 ${gainDb ?? '없음'}dB 적용 (편 ${r.folders.join(', ')})${failed}`
          + (notWritten.length ? `\n렌더용 파일을 못 갈았습니다: ${notWritten.map(e => `${e.folder} — ${e.reason}`).join(' / ')}` : ''),
      })
    } catch (e) {
      setGainNotice({ ok: false, text: `음량 적용 실패: ${errText(e)}` })
    } finally {
      setGainApplyingId(null)
    }
  }

  // 가져오기 — 편집 중인 언어의 셀럽 보이스(voice_id_ko / voice_id_en)를 끌어와 그 언어 칸에 채운다.
  const pullVoiceFromDb = async () => {
    if (!celebKey) return
    setDbBusy(true); setDbNotice(null); setError(null)
    try {
      const res = await fetch(`/api/celebs/${encodeURIComponent(celebKey)}/voice`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? '조회 실패')
      const dbVoice = voiceLang === 'en' ? data.voice_id_en : data.voice_id_ko
      if (dbVoice) { spec.setEleVoiceId(dbVoice); setDbNotice(`셀럽 ${langLabel} 보이스를 가져왔다`) }
      else setDbNotice(`셀럽에 저장된 ${langLabel} 보이스가 없다`)
    } catch (e) { setError(`DB 가져오기 실패: ${String(e)}`) }
    finally { setDbBusy(false) }
  }

  // 저장 — 현재 언어 칸의 보이스를 같은 언어의 셀럽 보이스에 올린다(충돌 시 BO 값이 DB를 덮는다).
  const pushVoiceToDb = async () => {
    if (!celebKey || !spec.eleVoiceId) return
    setDbBusy(true); setDbNotice(null); setError(null)
    try {
      const res = await fetch(`/api/celebs/${encodeURIComponent(celebKey)}/voice`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale: voiceLang, voiceId: spec.eleVoiceId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? '저장 실패')
      setDbNotice(`현재 보이스를 셀럽 ${langLabel}에 저장했다`)
    } catch (e) { setError(`DB 저장 실패: ${String(e)}`) }
    finally { setDbBusy(false) }
  }

  const hasTempPreview = gen.tempPreview?.key === secKey
  const previewEngine = gen.tempPreview?.engine ?? null

  const engineLabel = spec.chosenEngine === 'elevenlabs'
    ? 'ELE' : spec.chosenEngine === 'gemini-v3' ? 'GEM 3.1' : 'GEM 2.5'

  return (
    <div className="relative space-y-3" onClick={e => e.stopPropagation()}>

      {/* ── 생성·트림 모드 — 두 기둥. 좌: 해당(저장된) 음원 설정 / 우: 음원 만들기 설정. 넓은 모달 폭을 활용한다. ── */}
      {mode === 'main' && (
      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-2">
      <div className="min-w-0 space-y-3">
      <h3 className="border-b border-border pb-1.5 text-sm font-bold text-text-primary">해당 음원 설정</h3>
      {/* 저장된 음원 — 디스크 wav + 트림. 인물은 한 파일에 한 엔진 결과만 저장되므로 파형 한 개. */}
      <SavedVoiceSection
        tracks={activeFile ? [{ label: engineLabel, file: activeFile, active: true }] : []}
        playUrl={f => `/api/${series}/voice/${folderToParam(episodeName)}/${encodeURIComponent(f.name)}${gen.reloadTick ? `?t=${gen.reloadTick}` : ''}`}
        trimStart={gen.trimStart}
        setTrimStart={gen.setTrimStart}
        trimEnd={gen.trimEnd}
        setTrimEnd={gen.setTrimEnd}
        trimSaving={gen.trimSaving}
        saveTrimmed={gen.saveTrimmed}
        playbackRate={spec.playbackRate}
        gainDb={spec.gainDb}
        resetTrimOnFileChange
      />

      {/* 배속·게인 — 엔진(GEM/ELE) 공통. 렌더(Faction audioEl)에 그대로 적용되는 값이라 항상 노출한다.
          여기서 바꾼 값은 인물 quotePlaybackRate / quoteGainDb 에 저장되고, 위 저장 음원·아래 미리듣기
          재생에도 즉시 반영된다(배속·게인을 귀로 확인 후 렌더로 넘긴다). */}
      <FactionRateGainControls
        playbackRate={spec.playbackRate}
        setPlaybackRate={spec.setPlaybackRate}
        gainDb={spec.gainDb}
        setGainDb={spec.setGainDb}
        gainDbInherited={spec.gainDbInherited}
      />
      </div>

      <div className="min-w-0 space-y-3">
      <h3 className="border-b border-border pb-1.5 text-sm font-bold text-text-primary">음원 만들기 설정</h3>
      {/* 엔진 선택 + ELE 보이스 — 한 행. 엔진은 좁게 두고, ELE 선택 시 보이스 콤보박스가 남는 폭을 채운다.
          아래 「새 음원 생성」 섹션의 엔진 드롭다운은 hideEngineSelect 로 숨겨 중복을 없앤다. */}
      <div className="flex items-stretch gap-2">
        <div className="flex items-stretch rounded border border-border overflow-hidden shrink-0">
          <span className="px-2 flex items-center text-sm text-text-secondary bg-slate-100 text-slate-800 font-extrabold border-r border-slate-300 shrink-0">엔진</span>
          <select
            value={spec.chosenEngine}
            onChange={e => spec.setChosenEngine(e.target.value as GenEngine)}
            onClick={e => e.stopPropagation()}
            title="음성 합성 엔진. GEM=Gemini, ELE=ElevenLabs. 이 선택에 따라 아래 보이스·옵션이 달라진다"
            className="h-8 text-sm bg-white px-2 cursor-pointer text-slate-950 font-bold focus:outline-none"
          >
            <option value="gemini">GEM 2.5</option>
            <option value="gemini-v3">GEM 3.1</option>
            <option value="elevenlabs">ELE</option>
          </select>
        </div>
        {/* 보이스 콤보박스 — 드롭다운(전체 목록 + 이름 검색) + voiceId 직접 지정을 한 위젯에. */}
        {spec.chosenEngine === 'elevenlabs' && (
          <div className="min-w-0 flex-1">
            <EleVoiceCombobox
              voices={eleVoices}
              value={spec.eleVoiceId}
              onChange={spec.setEleVoiceId}
              loading={eleVoicesLoading}
              error={eleVoicesError}
              recommendations={eleVoiceRecommendations}
              voiceNotes={eleVoiceNotes.notes}
              notesLoading={eleVoiceNotes.loading}
              notesError={eleVoiceNotes.error}
              savingVoiceId={eleVoiceNotes.savingVoiceId}
              onUpdateVoiceNote={eleVoiceNotes.updateVoiceNote}
              voiceHistory={eleVoiceHistory.history}
              historyLoading={eleVoiceHistory.loading}
              historyError={eleVoiceHistory.error}
              historyUsageCount={eleVoiceHistory.usageCount}
              onApplyVoiceGain={v => applyVoiceGain(v.voice_id)}
              applyingGainVoiceId={gainApplyingId}
            />
          </div>
        )}
      </div>

      {/* ELE 감정/강도·DB 연동 — 북리커맨드는 상위 VOICE 패널에서 화자별로 보유하지만, 세력도감는 그
          패널이 없으므로 인물 단위로 여기서 입력받는다(데이터 연결부). ELE 선택 시에만, 북리커맨드
          ENGINE 행 입력칸과 같은 슬레이트 인라인 박스 스타일로 노출한다. */}
      {spec.chosenEngine === 'elevenlabs' && (
        <div className="space-y-2">
          {/* 셀럽 DB 보이스 연동 — 같은 인물(celebId)의 국문 보이스를 끌어오거나 현재 값을 DB에 올린다.
              DB에 등록된 인물(celebId·slug 보유)일 때만 활성. 충돌 시 저장은 BO 값이 DB를 덮는다. */}
          {/* 어느 언어를 다루는 중인지 못박는다 — 편집 언어를 바꾸면 이 줄과 아래 두 버튼이 함께 바뀐다 */}
          <p className="text-[11px] text-text-dim">
            지금 고르는 보이스는 <span className="font-semibold text-text-secondary">{langLabel} 대사</span>용이며,
            셀럽 연동도 {langLabel} 보이스와 주고받는다. 다른 언어는 편집 언어를 바꾸면 따로 지정한다.
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={e => { e.stopPropagation(); pullVoiceFromDb() }}
              disabled={!celebKey || dbBusy}
              title={celebKey ? `셀럽에 등록된 ${langLabel} 보이스를 가져온다` : 'DB에 등록된 인물이 아니다(셀럽 검색으로 추가하면 연동된다)'}
              className="flex-1 rounded border border-border px-2 py-1.5 text-xs font-semibold text-text-secondary hover:bg-bg-hover disabled:opacity-40 disabled:cursor-not-allowed"
            >↓ 셀럽 {langLabel} 가져오기</button>
            <button
              type="button"
              onClick={e => { e.stopPropagation(); pushVoiceToDb() }}
              disabled={!celebKey || !spec.eleVoiceId || dbBusy}
              title={celebKey ? `현재 보이스를 셀럽 ${langLabel}에 저장한다(기존 값을 덮는다)` : 'DB에 등록된 인물이 아니다'}
              className="flex-1 rounded border border-border px-2 py-1.5 text-xs font-semibold text-text-secondary hover:bg-bg-hover disabled:opacity-40 disabled:cursor-not-allowed"
            >↑ 셀럽 {langLabel}에 저장</button>
          </div>
          {dbNotice && <p className="text-[11px] text-text-dim">{dbNotice}</p>}
          {gainNotice && (
            <p className={`whitespace-pre-wrap text-[11px] ${gainNotice.ok ? 'text-text-dim' : 'text-danger-text'}`}>{gainNotice.text}</p>
          )}

          {/* 인물 감정/강도(quoteEleOptions) — 미리듣기·생성 호출에 settings 로 전달. 비우면 라우트 기본값. */}
          <div className="flex items-stretch rounded border border-border overflow-hidden">
            <span className="px-2 flex items-center text-sm text-text-secondary bg-slate-100 text-slate-800 font-extrabold border-r border-slate-300 shrink-0">감정·강도</span>
            <div className="flex flex-1 items-center gap-4 bg-white px-3 py-1.5">
              <label className="flex items-center gap-2 text-xs text-slate-700 font-semibold" title="안정성. 낮을수록 표현이 강하고 변화가 크다(기본 0.5)">
                안정성
                <input
                  type="range" min={0} max={1} step={0.05}
                  value={spec.eleOptions?.stability ?? 0.5}
                  onChange={e => spec.setEleOptions({ ...spec.eleOptions, stability: Number(e.target.value) })}
                  onClick={e => e.stopPropagation()}
                  className="w-24 accent-slate-700"
                />
                <span className="w-8 text-right font-mono text-slate-900">{(spec.eleOptions?.stability ?? 0.5).toFixed(2)}</span>
              </label>
              <label className="flex items-center gap-2 text-xs text-slate-700 font-semibold" title="스타일 과장. 높을수록 감정·억양이 강조된다(기본 0.3)">
                스타일
                <input
                  type="range" min={0} max={1} step={0.05}
                  value={spec.eleOptions?.style ?? 0.3}
                  onChange={e => spec.setEleOptions({ ...spec.eleOptions, style: Number(e.target.value) })}
                  onClick={e => e.stopPropagation()}
                  className="w-24 accent-slate-700"
                />
                <span className="w-8 text-right font-mono text-slate-900">{(spec.eleOptions?.style ?? 0.3).toFixed(2)}</span>
              </label>
            </div>
          </div>

          {/* 감정 태그 — 북리커맨드 EleSettingsSection 의 감정 선택 UI 이식. 태그 토글(최대 2개)·직접 입력·끝 패딩.
              본문에 "[tag1, tag2] 대사 ... ... ..." 형태로 삽입돼 미리듣기·생성에 반영된다. */}
          <div className="rounded border border-border overflow-hidden">
            <div className="flex items-center gap-2 px-2 py-1.5 bg-slate-100 border-b border-slate-300">
              <span className="text-sm text-slate-800 font-extrabold">감정 태그</span>
              {spec.eleEmotions.length > 0 && (
                <span className="text-[11px] font-mono text-purple-700 font-black">[{spec.eleEmotions.join(', ')}]</span>
              )}
              <span className="ml-auto text-[10px] text-slate-500 font-bold">최대 2개</span>
              {/* 끝 패딩 — 본문 끝에 ' ... ... ...' 을 붙여 끝 음절 잘림을 줄인다. 기본 켜짐. */}
              <button
                type="button"
                onClick={e => { e.stopPropagation(); spec.setEleTrail(!spec.eleTrail) }}
                title="본문 끝에 ' ... ... ...' 을 붙여 끝 음절이 잘리는 현상을 줄인다"
                className={`px-2 py-0.5 rounded text-[11px] border font-extrabold ${
                  spec.eleTrail
                    ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                    : 'bg-white border-slate-300 text-slate-500 hover:border-purple-500 hover:bg-purple-50'
                }`}
              >끝 패딩</button>
            </div>
            <div className="bg-white px-3 py-2">
              <EleEmotionPicker value={spec.eleEmotions} onChange={spec.setEleEmotions} />
            </div>
          </div>
        </div>
      )}

      {/* 새 음원 생성 — 북리커맨드 GenerateSection 그대로 재사용 (화면 동일) */}
      <GenerateSection
        secKey={secKey}
        sectionTexts={spec.sectionTexts}
        ttsText={spec.ttsText}
        setTtsText={spec.setTtsText}
        chosenEngine={spec.chosenEngine}
        setChosenEngine={spec.setChosenEngine}
        generating={gen.generating}
        handleCancelGenerate={gen.handleCancelGenerate}
        engineSpec={spec.engineSpec}
        eleSpec={spec.eleSpec}
        geminiSpec={spec.geminiSpec}
        activeSpec={spec.activeSpec}
        voiceOverride={spec.voiceOverride}
        // 인물은 쇼츠 세그먼트가 아니다 — 캐릭터 보이스는 voiceOverride 로 인물에 저장된다.
        segmentLocator={null}
        handleSegmentFieldChange={() => {}}
        // 스타일은 인물 quoteStyle 에 영속 — segmentLocator 가 null 이라 blur 시 longform 경로로 들어오므로
        // 그 콜백(handleLongformStyleChange)을 saveQuoteStyle 에 연결해 인물 데이터에 저장한다.
        styleEdit={styleEdit}
        setStyleEdit={setStyleEdit}
        handleLongformStyleChange={spec.saveQuoteStyle}
        hasTempPreview={hasTempPreview}
        tempPreview={gen.tempPreview}
        previewEngine={previewEngine}
        handleSavePreview={() => gen.handleSavePreview()}
        trimSaving={gen.trimSaving}
        setTempPreview={gen.setTempPreview}
        handleGenerate={gen.handleGenerate}
        // 인물은 ELE 구간 톤 JSON 경로가 없다 — 톤 에디터는 숨고, 페이지 기본 톤 요약만 표시(북리커맨드와 동일 분기).
        segmentPath={null}
        segmentMeta={undefined}
        metaSaving={false}
        metaError={null}
        handleSegmentMetaChange={() => {}}
        eleSendOpts={DEFAULT_ELE_SEND_OPTS}
        // 미리듣기 재생에도 인물 배속·게인을 반영 — 저장 음원과 같은 청취 조건으로 들어본다.
        previewPlaybackRate={spec.playbackRate}
        previewGainDb={spec.gainDb}
        // 엔진 선택은 위쪽에 따로 두었으므로 이 섹션의 엔진 드롭다운은 숨긴다(중복 제거).
        hideEngineSelect
        // 발화시각 정렬 — 음원이 확정되면 눌러 자막 타이밍을 맞춘다(백그라운드 작업).
        onAlign={() => gen.alignCurrent()}
        aligning={gen.aligning}
        canAlign={!!activeFile}
      />
      </div>
      </div>
      )}

      {/* ── 싱크 보정 모드 — whisper 오차를 음원 들으며 드래그로 교정 ── */}
      {mode === 'sync' && (
        activeFile
          ? <FactionSyncContent series={series} episodeName={episodeName} voiceFile={voiceFile} person={person} />
          : <div className="px-1 py-2 text-xs text-text-dim">저장된 음원이 없다. 「생성·트림」에서 먼저 음원을 만든다.</div>
      )}

      {/* ── 들숨 제거 모드 — 저장된 음원의 들숨·잡소리 구간 무음 처리 ── */}
      {mode === 'breath' && (
        activeFile
          ? (
            <BreathModeContent
              series={series}
              name={episodeName}
              file={activeFile}
              // 들숨 저장은 생성 훅 밖에서 wav 를 바꾼다 — 목록 재조회에 더해 저장 음원 캐시버스터도 갱신해야
              // 생성·트림 화면이 브라우저에 캐시된 옛 파형을 다시 그리지 않는다.
              onRefresh={() => { gen.bumpReload(); onRefresh() }}
              endpoints={breathEndpoints}
            />
          )
          : <div className="px-1 py-2 text-xs text-text-dim">저장된 음원이 없다. 「생성·트림」에서 먼저 음원을 만든다.</div>
      )}

      {/* ── 연령 변형 모드 — 저장된 음원을 늙게/젊게 변형(원본 보관·되돌리기 가능) ── */}
      {mode === 'age' && (
        activeFile
          ? (
            <AgeModeContent
              series={series}
              name={episodeName}
              file={activeFile}
              // 연령 변형은 길이를 유지하지만, 저장 음원 캐시버스터를 갱신해 생성·트림 화면이 옛 파형을 다시 그리지 않게 한다.
              onRefresh={() => { gen.bumpReload(); onRefresh() }}
              // 연령 변형도 서버 작업이라 위와 같은 이유로 최신 인물 기준으로 적는다
              onCommitted={dur => onChangeRef.current({ ...personRef.current, [slot.fields.duration]: dur })}
              endpoints={ageEndpoints}
            />
          )
          : <div className="px-1 py-2 text-xs text-text-dim">저장된 음원이 없다. 「생성·트림」에서 먼저 음원을 만든다.</div>
      )}

      {error && <div className="text-xs text-danger-text">{error}</div>}
    </div>
  )
}
