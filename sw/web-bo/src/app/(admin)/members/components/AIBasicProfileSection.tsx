'use client'

import { useState } from 'react'
import { generateCelebProfile } from '@/actions/admin/celebs'
import { getCelebProfessionLabel } from '@/constants/celebCategories'
import { useCountries, getCountryName } from '@/hooks/useCountries'
import { Sparkles, Loader2, Check, X } from 'lucide-react'
import Button from '@/components/ui/Button'

// #region Types
interface GeneratedProfile {
  bio: string
  profession: string
  nationality?: string
  birthDate?: string
  deathDate?: string
  quotes?: string
  fullname?: string
}

type ProfileField = 'fullname' | 'profession' | 'nationality' | 'birthDate' | 'deathDate' | 'bio' | 'quotes'

interface Props {
  guessedName: string
  onApply: (fields: Partial<GeneratedProfile>) => void
}
// #endregion

// #region Constants
const FIELD_LABELS: Record<ProfileField, string> = {
  fullname: '풀네임',
  profession: '직군',
  nationality: '국적',
  birthDate: '출생',
  deathDate: '사망',
  bio: '소개',
  quotes: '명언',
}

const FIELD_ORDER: ProfileField[] = ['fullname', 'profession', 'nationality', 'birthDate', 'deathDate', 'bio', 'quotes']
// #endregion

export default function AIBasicProfileSection({ guessedName, onApply }: Props) {
  // 국가 목록 캐시 초기화
  useCountries()

  const [description, setDescription] = useState('')
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<GeneratedProfile | null>(null)
  const [selected, setSelected] = useState<Record<ProfileField, boolean>>({
    fullname: true,
    profession: true,
    nationality: true,
    birthDate: true,
    deathDate: true,
    bio: true,
    quotes: true,
  })

  async function handleGenerate() {
    if (!guessedName.trim()) {
      setError('먼저 추정 닉네임을 입력하세요.')
      return
    }

    setGenerating(true)
    setError(null)

    try {
      const res = await generateCelebProfile({ name: guessedName, description })
      if (!res.success) throw new Error(res.error)
      setResult(res.profile!)
      // 값이 있는 필드만 기본 선택
      setSelected({
        fullname: !!res.profile!.fullname,
        profession: !!res.profile!.profession,
        nationality: !!res.profile!.nationality,
        birthDate: !!res.profile!.birthDate,
        deathDate: !!res.profile!.deathDate,
        bio: !!res.profile!.bio,
        quotes: !!res.profile!.quotes,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI 프로필 생성에 실패했습니다.')
    } finally {
      setGenerating(false)
    }
  }

  function handleToggle(field: ProfileField) {
    setSelected((prev) => ({ ...prev, [field]: !prev[field] }))
  }

  function handleApply() {
    if (!result) return
    const fields: Partial<GeneratedProfile> = {}
    if (selected.fullname && result.fullname) fields.fullname = result.fullname
    if (selected.profession && result.profession) fields.profession = result.profession
    if (selected.nationality && result.nationality) fields.nationality = result.nationality
    if (selected.birthDate && result.birthDate) fields.birthDate = result.birthDate
    if (selected.deathDate && result.deathDate) fields.deathDate = result.deathDate
    if (selected.bio && result.bio) fields.bio = result.bio
    if (selected.quotes && result.quotes) fields.quotes = result.quotes
    onApply(fields)
    setResult(null)
    setDescription('')
  }

  function getFieldValue(field: ProfileField): string {
    if (!result) return ''
    const value = result[field]
    if (!value) return '(없음)'
    if (field === 'profession') return getCelebProfessionLabel(value)
    if (field === 'nationality') return getCountryName(value)
    return value
  }

  return (
    <div className="bg-bg-secondary/50 border border-border rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-accent" />
        <span className="text-sm font-medium text-text-primary">AI 기본 정보 생성</span>
      </div>

      <div className="space-y-2">
        <label htmlFor="ai-basic-description" className="block text-sm font-medium text-text-secondary">
          인물 설명 (선택)
        </label>
        <textarea
          id="ai-basic-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="예: 테슬라 CEO, 스페이스X 창업자..."
          rows={2}
          className="w-full px-4 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary placeholder-text-secondary focus:border-accent focus:outline-none resize-none"
        />
        <p className="text-xs text-text-secondary">AI가 풀네임, 직군, 국적, 출생/사망일, 소개, 명언을 생성합니다.</p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">{error}</div>
      )}

      {!result && (
        <Button type="button" variant="secondary" onClick={handleGenerate} disabled={generating || !guessedName.trim()}>
          {generating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              생성 중...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              AI 생성
            </>
          )}
        </Button>
      )}

      {result && (
        <div className="bg-bg-secondary rounded-lg p-4 space-y-3">
          <h4 className="text-sm font-medium text-text-primary">생성 결과 (적용할 항목 선택)</h4>

          <div className="space-y-2">
            {FIELD_ORDER.map((field) => {
              const value = getFieldValue(field)
              const hasValue = value !== '(없음)'
              return (
                <label
                  key={field}
                  className={`flex items-start gap-3 p-2 rounded-lg cursor-pointer hover:bg-white/5 ${!hasValue ? 'opacity-50' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={selected[field]}
                    onChange={() => handleToggle(field)}
                    disabled={!hasValue}
                    className="mt-0.5 w-4 h-4 rounded border-border bg-bg-secondary text-accent focus:ring-accent"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs text-text-secondary">{FIELD_LABELS[field]}</span>
                    <p className="text-sm text-text-primary truncate">{value}</p>
                  </div>
                </label>
              )
            })}
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" size="sm" onClick={handleApply}>
              <Check className="w-4 h-4" />
              선택 항목 적용
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setResult(null)}>
              <X className="w-4 h-4" />
              취소
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
