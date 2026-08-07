'use client'

import { useState, useCallback } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Star, Loader2, Volume2 } from 'lucide-react'
import { getCelebVoiceDetail, type VoiceGenCeleb } from '@/actions/admin/voice-gen'
import CelebSearchBar, { type CelebSearchItem } from '@/components/celeb/CelebSearchBar'
import CelebDialogueStudio from '@/components/celeb/dialogue-studio/CelebDialogueStudio'
import { useToast } from '@/contexts/ToastContext'

const SEARCH_PLACEHOLDER = '셀럽 이름 검색 후 Enter로 작업 대상 선택'
const EMPTY_MESSAGE = '검색 결과가 없습니다.'
const VOICE_BADGE_LABEL = '음성'
const VOICE_ON_BADGE_LABEL = '음성 ON'
const CELEB_LOAD_FAIL_LABEL = '셀럽 데이터를 불러오지 못했습니다'
const CELEB_LOADING_LABEL = '대사·음성 데이터를 불러오는 중입니다'
const SELECT_CELEB_FIRST_LABEL = '상단에서 셀럽을 검색하고 선택하세요'

/** 검색 창구(`/api/celebs/search`)가 돌려주는 항목 중 이 화면이 배지로 쓰는 값 */
interface VoiceGenSearchItem extends CelebSearchItem {
  has_voice?: boolean | null
  voice_id_ko?: string | null
  voice_id_en?: string | null
}

interface Props {
  initialCeleb?: VoiceGenCeleb | null
}

/**
 * 대사·음성 작업실 — 인물을 고르는 껍데기다.
 * 편집 기능 자체는 `CelebDialogueStudio`가 전부 쥐고 있고, 인물 상세 화면도 같은 것을 쓴다.
 */
export default function VoiceGenWorkspace({ initialCeleb }: Props) {
  const router = useRouter()
  const { showToast } = useToast()

  const [selected, setSelected] = useState<VoiceGenCeleb | null>(initialCeleb ?? null)
  const [loading, setLoading] = useState(false)

  // 고른 인물 한 명의 대사·음성 데이터만 새로 읽는다
  const selectCeleb = useCallback(async (item: { id?: string; slug: string | null }) => {
    const key = item.id || item.slug
    if (!key) return
    setLoading(true)
    try {
      const celeb = await getCelebVoiceDetail(key)
      if (!celeb) {
        showToast('error', CELEB_LOAD_FAIL_LABEL)
        return
      }
      setSelected(celeb)
      if (celeb.slug) router.push(`/celebs/voice-gen/${celeb.slug}`, { scroll: false })
    } catch (err) {
      showToast('error', `${CELEB_LOAD_FAIL_LABEL}: ${String(err)}`)
    } finally {
      setLoading(false)
    }
  }, [router, showToast])

  return (
    <div className="space-y-4">
      {/* 상단: 검색바 + 선택된 인물 */}
      <div className="bg-bg-card border border-border rounded-xl p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <CelebSearchBar<VoiceGenSearchItem>
            maxResults={20}
            clearOnSelect
            className="flex-1 max-w-sm"
            placeholder={SEARCH_PLACEHOLDER}
            emptyMessage={EMPTY_MESSAGE}
            onSelect={(celeb) => { void selectCeleb(celeb) }}
            renderSuggestionExtra={(celeb) => (
              <div className="flex items-center gap-1">
                {celeb.has_voice && (
                  <span className="px-1 py-px rounded text-[9px] font-medium bg-emerald-500/15 text-emerald-400">
                    {VOICE_BADGE_LABEL}
                  </span>
                )}
                {celeb.voice_id_ko && (
                  <span className="px-1 py-px rounded text-[9px] font-medium bg-blue-500/15 text-blue-400">KO</span>
                )}
                {celeb.voice_id_en && (
                  <span className="px-1 py-px rounded text-[9px] font-medium bg-purple-500/15 text-purple-400">EN</span>
                )}
              </div>
            )}
          />

          {selected && (
            <div className="flex items-center gap-3 px-3 py-1.5 bg-bg-secondary rounded-lg border border-border">
              <div className="relative w-7 h-7 rounded-full bg-yellow-500/20 flex items-center justify-center overflow-hidden shrink-0">
                {selected.avatar_url ? (
                  <Image src={selected.avatar_url} alt="" fill unoptimized className="object-cover" />
                ) : (
                  <Star className="w-3 h-3 text-yellow-400" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-text-primary">{selected.nickname}</p>
                <p className="text-[10px] text-text-tertiary">{selected.slug}</p>
              </div>
              {selected.has_voice && (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-emerald-500/10 text-emerald-400">
                  {VOICE_ON_BADGE_LABEL}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="bg-bg-card border border-border rounded-xl p-12 flex flex-col items-center justify-center text-text-tertiary">
          <Loader2 className="w-8 h-8 mb-3 animate-spin opacity-60" />
          <p className="text-sm">{CELEB_LOADING_LABEL}</p>
        </div>
      ) : !selected ? (
        <div className="bg-bg-card border border-border rounded-xl p-12 flex flex-col items-center justify-center text-text-tertiary">
          <Volume2 className="w-10 h-10 mb-3 opacity-40" />
          <p className="text-sm">{SELECT_CELEB_FIRST_LABEL}</p>
        </div>
      ) : (
        <CelebDialogueStudio key={selected.id} celeb={selected} />
      )}
    </div>
  )
}
