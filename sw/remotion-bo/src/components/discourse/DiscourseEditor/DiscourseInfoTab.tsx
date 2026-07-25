'use client'

/**
 * 「정보」 탭 — 인물(cast)의 실체와 에피소드 전역 설정.
 *
 * 팩션 「정비」 탭의 자리이나 다루는 것이 다르다. 팩션은 세력 > 그룹 > 인물 계층을 세우지만
 * 담화는 인물이 평면이고 순서는 발언(편성 탭)이 정한다. 여기서는 인물이 **누구인지**만 정한다.
 */

import { useMemo } from 'react'
import type { DiscourseScript, Speaker } from '@/lib/discourse-types'
import { DEFAULT_NOTICE } from '@feelandnote/remotion/src/compositions/Discourse/constants'
import { Plus } from '@/components/icons'
import type { EditLang } from '@/components/editor'
import { useCelebExists } from '../shared/CelebBadge'
import { LangText, LangArea } from './sections/LangField'
import { SpeakerCard } from './sections/SpeakerCard'
import { CastColorBar } from './sections/CastColorBar'
import { ImageSlot, DISCOURSE_IMAGE_DND } from '@/components/media'
import { HOLD_MOTION_OPTIONS } from '@/components/faction/shared/holdMotion'

type Props = {
  script: DiscourseScript
  update: (patch: Partial<DiscourseScript>) => void
  setCast: (cast: Speaker[]) => void
  episodeName: string
  series: string
  editLang: EditLang
  musicList: string[]
}

/** 빈 값은 필드째 지운다 — 데이터 파일에 빈 문자열을 남기지 않는다 */
const orUndef = (v: string) => (v.trim() ? v : undefined)

const newSpeaker = (): Speaker => ({ name: '', lines: ['', '', ''] })

export function DiscourseInfoTab({ script, update, setCast, episodeName, series, editLang, musicList }: Props) {
  const cast = script.cast ?? []
  const { existing, loaded } = useCelebExists(cast)

  // 인물별 발언 수 — 이 인물이 실제로 말하는지, 지우면 무엇이 딸려 나가는지 알린다
  const turnCounts = useMemo(() => {
    const m = new Map<number, number>()
    script.turns?.forEach(t => m.set(t.cast, (m.get(t.cast) ?? 0) + 1))
    return m
  }, [script.turns])

  const setSpeaker = (i: number, next: Speaker) => setCast(cast.map((s, idx) => (idx === i ? next : s)))

  // 인물 삭제 — 발언이 cast 를 인덱스로 가리키므로 뒤 인물의 번호가 밀린다. 발언의 참조도 함께 옮긴다.
  const deleteSpeaker = (i: number) => {
    const n = turnCounts.get(i) ?? 0
    if (!confirm(n > 0
      ? `이 인물의 발언 ${n}개가 함께 지워집니다. 계속할까요?`
      : '이 인물을 지울까요?')) return
    const shift = (idx: number) => (idx > i ? idx - 1 : idx)
    setCast(cast.filter((_, idx) => idx !== i))
    update({
      turns: (script.turns ?? [])
        .filter(t => t.cast !== i)
        .map(t => ({ ...t, cast: shift(t.cast), to: t.to == null ? undefined : t.to === i ? undefined : shift(t.to) })),
    })
  }

  const moveSpeaker = (i: number, dir: -1 | 1) => {
    const j = i + dir
    if (j < 0 || j >= cast.length) return
    const next = [...cast]
    ;[next[i], next[j]] = [next[j], next[i]]
    // 인물 자리가 바뀌면 발언이 가리키는 번호도 함께 바꾼다 — 발언자가 뒤바뀌면 영상이 통째로 어긋난다
    const swap = (idx: number) => (idx === i ? j : idx === j ? i : idx)
    setCast(next)
    update({ turns: (script.turns ?? []).map(t => ({ ...t, cast: swap(t.cast), to: t.to == null ? undefined : swap(t.to) })) })
  }

  return (
    <div className="space-y-5">
      {/* ── 영상 전역 ── */}
      <section className="space-y-2 rounded-lg border border-border bg-bg-card/40 p-3">
        <h2 className="text-xs font-semibold text-text-secondary">영상 전역</h2>

        <LangArea
          label="영상 명칭 -" editLang={editLang}
          ko={script.title ?? ''} en={script.titleEn ?? ''}
          onKo={v => update({ title: v })} onEn={v => update({ titleEn: orUndef(v) })}
          placeholder={'영상 명칭\n첫 줄=앞부분, 둘째 줄부터=뒷부분'}
          hint="첫 줄이 앞부분(흰색), 둘째 줄부터가 뒷부분(인물색)으로 화면에 뜹니다."
        />
        <LangText
          label="논제 -" editLang={editLang}
          ko={script.topic ?? ''} en={script.topicEn ?? ''}
          onKo={v => update({ topic: orUndef(v) })} onEn={v => update({ topicEn: orUndef(v) })}
          placeholder="이 자리에서 무엇을 다투는가"
          hint="시작 화면에 크게 뜹니다. 인물 조합이 아니라 이 물음이 한 편을 만듭니다."
        />
        <LangText
          label="시작문구 -" editLang={editLang}
          ko={script.logline ?? ''} en={script.loglineEn ?? ''}
          onKo={v => update({ logline: orUndef(v) })} onEn={v => update({ loglineEn: orUndef(v) })}
          placeholder="시작 화면에서 주제를 먼저 알리는 한 문장"
        />
      </section>

      {/* ── 고지 ── 실존 인물이 하지 않은 말을 하는 시리즈의 최소 방어선. 끌 수 없다 ── */}
      <section className="space-y-2 rounded-lg border border-warning-text/40 bg-warning/30 p-3">
        <h2 className="text-xs font-semibold text-warning-text">고지 문구 (끌 수 없음)</h2>
        <LangArea
          label="고지 -" editLang={editLang}
          ko={script.notice ?? ''} en={script.noticeEn ?? ''}
          onKo={v => update({ notice: orUndef(v) })} onEn={v => update({ noticeEn: orUndef(v) })}
          placeholder="비워 두면 아래 기본 문구가 쓰입니다"
          rows={2}
        />
        <p className="text-[11px] leading-relaxed text-warning-text">
          이 시리즈는 실존 인물의 사상을 재구성해 말하게 합니다. 고지는 시작 화면·화면 하단 상시 안내·마지막 화면 세 곳에 반드시 나갑니다.
          <br />
          비워 두어도 안내가 사라지지 않습니다. 비우면 화면에 이 문구가 나갑니다 — <span className="font-semibold">“{DEFAULT_NOTICE}”</span>
        </p>
      </section>

      {/* ── 화면·소리 ── */}
      <section className="space-y-2 rounded-lg border border-border bg-bg-card/40 p-3">
        <h2 className="text-xs font-semibold text-text-secondary">화면 · 소리</h2>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="inline-flex items-center gap-1.5 text-xs text-text-dim">
            지속효과
            <select
              value={script.holdMotion ?? 'none'}
              onChange={e => update({ holdMotion: e.target.value === 'none' ? undefined : (e.target.value as DiscourseScript['holdMotion']) })}
              className="rounded-md border border-border bg-bg-card px-2 py-1.5 text-sm focus:border-accent focus:outline-none"
            >
              {HOLD_MOTION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <span className="text-[11px]">컷이 떠 있는 동안 사진 움직임 (인물·발언이 따로 정하면 그쪽 우선)</span>
          </span>

          <label className="inline-flex items-center gap-1.5 text-xs text-text-dim">
            <input
              type="checkbox"
              checked={script.showCastIntro !== false}
              onChange={e => update({ showCastIntro: e.target.checked ? undefined : false })}
              className="accent-accent"
            />
            인물 소개 컷 띄우기
            <span className="text-[11px]">끄면 시작 화면 다음 바로 첫 발언으로 넘어갑니다</span>
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="inline-flex items-center gap-1.5 text-xs text-text-dim">
            배경음악
            <select
              value={script.music ?? ''}
              onChange={e => update({ music: orUndef(e.target.value) })}
              className="rounded-md border border-border bg-bg-card px-2 py-1.5 text-sm focus:border-accent focus:outline-none"
            >
              <option value="">없음</option>
              {musicList.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs text-text-dim" title="발언 음성이 흐르는 동안에만 배경음악을 낮춘다">
            대사 중 음량
            <input
              type="range" min={0} max={1} step={0.05}
              value={script.musicDuckVolume ?? 1}
              onChange={e => { const v = Number(e.target.value); update({ musicDuckVolume: v === 1 ? undefined : v }) }}
              className="w-24 accent-accent"
            />
            <span className="w-9 text-right font-mono text-[10px] text-text-secondary">{Math.round((script.musicDuckVolume ?? 1) * 100)}%</span>
          </span>
        </div>

        <div className="flex flex-wrap items-start gap-5">
          <div className="flex items-start gap-2">
            <label className="mt-1 w-20 shrink-0 text-xs text-text-dim">시작 화면 -</label>
            <ImageSlot
              dnd={DISCOURSE_IMAGE_DND}
              captionArea
              value={script.introImage}
              onChange={v => update({ introImage: v })}
              series={series}
              episodeName={episodeName}
              size={88}
              emptyText="인물 그리드"
              pickerTitle="영상 시작 화면 사진"
            />
          </div>
          <div className="flex items-start gap-2">
            <label className="mt-1 w-20 shrink-0 text-xs text-text-dim">마지막 화면 -</label>
            <ImageSlot
              dnd={DISCOURSE_IMAGE_DND}
              captionArea
              value={script.outroImage}
              onChange={v => update({ outroImage: v })}
              series={series}
              episodeName={episodeName}
              size={88}
              emptyText="브랜드 로고"
              pickerTitle="영상 마지막 화면 사진"
            />
          </div>
          <div className="flex items-start gap-2">
            <label className="mt-1 w-20 shrink-0 text-xs text-text-dim">썸네일 -</label>
            <ImageSlot
              dnd={DISCOURSE_IMAGE_DND}
              captionArea
              value={script.lvThumbnailImage}
              onChange={v => update({ lvThumbnailImage: v })}
              series={series}
              episodeName={episodeName}
              size={88}
              emptyText="첫 인물 사진"
              pickerTitle="긴 영상 썸네일에 쓸 사진"
            />
          </div>
        </div>
        <p className="text-[11px] text-text-dim">
          비워 두면 각각 인물 얼굴을 늘어놓은 화면, 브랜드 로고, 첫 인물 사진이 대신 나갑니다.
        </p>
      </section>

      {/* ── 인물 ── */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-semibold text-text-secondary">등장 인물 {cast.length}명</h2>
          <button
            onClick={() => setCast([...cast, newSpeaker()])}
            className="flex items-center gap-1 rounded-md border border-border bg-bg-card px-2.5 py-1 text-xs font-semibold text-text-secondary hover:border-accent hover:text-accent"
          >
            <Plus size={13} /> 인물 추가
          </button>
        </div>

        {/* 인물색 한눈 — 발언자 식별이 색에 걸려 있어 인물마다 갈려야 한다 */}
        <CastColorBar cast={cast} />

        {cast.map((sp, i) => (
          <SpeakerCard
            key={i}
            speaker={sp}
            index={i}
            total={cast.length}
            turnCount={turnCounts.get(i) ?? 0}
            episodeName={episodeName}
            series={series}
            editLang={editLang}
            celebExisting={existing}
            celebLoaded={loaded}
            onChange={next => setSpeaker(i, next)}
            onDelete={() => deleteSpeaker(i)}
            onMoveUp={() => moveSpeaker(i, -1)}
            onMoveDown={() => moveSpeaker(i, 1)}
          />
        ))}

        {cast.length === 0 && (
          <p className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-text-dim">
            아직 인물이 없습니다. 「인물 추가」로 시작하세요.
          </p>
        )}
      </section>
    </div>
  )
}
