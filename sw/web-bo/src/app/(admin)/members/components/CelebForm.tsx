'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createCeleb, updateCeleb, deleteCeleb } from '@/actions/admin/celebs'
import type { GeneratedInfluence } from '@feelnnote/api-clients'
import type { Member } from '@/actions/admin/members'
import { CELEB_PROFESSIONS } from '@/constants/celebCategories'
import { useCountries } from '@/hooks/useCountries'
import { Loader2, Trash2, Star, X } from 'lucide-react'
import Button from '@/components/ui/Button'
import AIProfileSection from './AIProfileSection'

// #region Types
interface CelebFormData {
  nickname: string
  profession: string
  nationality: string
  birth_date: string
  death_date: string
  bio: string
  quotes: string
  avatar_url: string
  portrait_url: string
  is_verified: boolean
  status: 'active' | 'suspended'
}

interface Props {
  mode: 'create' | 'edit'
  celeb?: Member
}

interface GeneratedProfile {
  bio: string
  profession: string
  avatarUrl: string
  nationality: string
  birthDate: string
  deathDate: string
  quotes: string
  influence: GeneratedInfluence
}

const INFLUENCE_LABELS: Record<string, { label: string; max: number }> = {
  political: { label: '정치·외교', max: 10 },
  strategic: { label: '전략·안보', max: 10 },
  tech: { label: '기술·과학', max: 10 },
  social: { label: '사회·윤리', max: 10 },
  economic: { label: '산업·경제', max: 10 },
  cultural: { label: '문화·예술', max: 10 },
  transhistoricity: { label: '통시성', max: 40 },
}

const RANK_COLORS: Record<string, string> = {
  S: 'bg-yellow-500 text-yellow-900',
  A: 'bg-purple-500 text-white',
  B: 'bg-blue-500 text-white',
  C: 'bg-green-500 text-white',
  D: 'bg-gray-500 text-white',
}
// #endregion

// #region Helpers
function getInitialFormData(celeb?: Member): CelebFormData {
  return {
    nickname: celeb?.nickname || '',
    profession: celeb?.profession || '',
    nationality: celeb?.nationality || '',
    birth_date: celeb?.birth_date || '',
    death_date: celeb?.death_date || '',
    bio: celeb?.bio || '',
    quotes: celeb?.quotes || '',
    avatar_url: celeb?.avatar_url || '',
    portrait_url: celeb?.portrait_url || '',
    is_verified: celeb?.is_verified || false,
    status: (celeb?.status as 'active' | 'suspended') || 'active',
  }
}

function getEmptyInfluence(): GeneratedInfluence {
  return {
    political: { score: 0, exp: '' },
    strategic: { score: 0, exp: '' },
    tech: { score: 0, exp: '' },
    social: { score: 0, exp: '' },
    economic: { score: 0, exp: '' },
    cultural: { score: 0, exp: '' },
    transhistoricity: { score: 0, exp: '' },
    totalScore: 0,
    rank: 'D',
  }
}

function calculateRank(totalScore: number): 'S' | 'A' | 'B' | 'C' | 'D' {
  if (totalScore >= 90) return 'S'
  if (totalScore >= 80) return 'A'
  if (totalScore >= 70) return 'B'
  if (totalScore >= 60) return 'C'
  return 'D'
}
// #endregion

export default function CelebForm({ mode, celeb }: Props) {
  const router = useRouter()
  const { countries, loading: countriesLoading } = useCountries()
  const [formData, setFormData] = useState<CelebFormData>(getInitialFormData(celeb))
  const [influence, setInfluence] = useState<GeneratedInfluence>(getEmptyInfluence())
  const [loading, setLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  function applyAIProfile(profile: GeneratedProfile) {
    setFormData((prev) => ({
      ...prev,
      bio: profile.bio,
      profession: profile.profession,
      avatar_url: profile.avatarUrl || prev.avatar_url,
      nationality: profile.nationality || prev.nationality,
      birth_date: profile.birthDate || prev.birth_date,
      death_date: profile.deathDate || prev.death_date,
      quotes: profile.quotes || prev.quotes,
    }))
    setInfluence(profile.influence)
  }

  function handleChange(field: keyof CelebFormData, value: string | boolean) {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  function handleInfluenceChange(field: string, type: 'score' | 'exp', value: number | string) {
    setInfluence((prev) => {
      const updated = {
        ...prev,
        [field]: {
          ...prev[field as keyof GeneratedInfluence] as { score: number; exp: string },
          [type]: value,
        },
      }
      const totalScore =
        (updated.political as { score: number }).score +
        (updated.strategic as { score: number }).score +
        (updated.tech as { score: number }).score +
        (updated.social as { score: number }).score +
        (updated.economic as { score: number }).score +
        (updated.cultural as { score: number }).score +
        (updated.transhistoricity as { score: number }).score
      return { ...updated, totalScore, rank: calculateRank(totalScore) }
    })
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    if (!formData.nickname.trim()) {
      setError('닉네임을 입력해주세요.')
      setLoading(false)
      return
    }

    try {
      if (mode === 'create') {
        const hasInfluence = influence.totalScore > 0
        const result = await createCeleb({
          nickname: formData.nickname.trim(),
          profession: formData.profession || undefined,
          nationality: formData.nationality || undefined,
          birth_date: formData.birth_date || undefined,
          death_date: formData.death_date || undefined,
          bio: formData.bio || undefined,
          quotes: formData.quotes || undefined,
          avatar_url: formData.avatar_url || undefined,
          portrait_url: formData.portrait_url || undefined,
          is_verified: formData.is_verified,
          influence: hasInfluence ? influence : undefined,
        })
        router.push(`/members/${result.id}`)
      } else if (celeb) {
        await updateCeleb({
          id: celeb.id,
          nickname: formData.nickname.trim(),
          profession: formData.profession || undefined,
          nationality: formData.nationality || undefined,
          birth_date: formData.birth_date || undefined,
          death_date: formData.death_date || undefined,
          bio: formData.bio || undefined,
          quotes: formData.quotes || undefined,
          avatar_url: formData.avatar_url || undefined,
          portrait_url: formData.portrait_url || undefined,
          is_verified: formData.is_verified,
          status: formData.status,
        })
        setSuccess(true)
        router.refresh()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!celeb) return
    if (!confirm('정말로 이 셀럽 계정을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return

    setDeleteLoading(true)
    setError(null)

    try {
      await deleteCeleb(celeb.id)
      router.push('/members?tab=celeb')
    } catch (err) {
      setError(err instanceof Error ? err.message : '삭제에 실패했습니다.')
      setDeleteLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400 text-sm">{error}</div>}
      {success && <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 text-green-400 text-sm">저장되었습니다.</div>}

      {/* Basic Info */}
      <div className="bg-bg-card border border-border rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold text-text-primary">{mode === 'create' ? '기본 정보' : '프로필 수정'}</h2>

        <div className="space-y-2">
          <label htmlFor="nickname" className="block text-sm font-medium text-text-secondary">닉네임 <span className="text-red-400">*</span></label>
          <input type="text" id="nickname" required value={formData.nickname} onChange={(e) => handleChange('nickname', e.target.value)} placeholder="셀럽 닉네임" className="w-full px-4 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary placeholder-text-secondary focus:border-accent focus:outline-none" />
        </div>

        <AIProfileSection nickname={formData.nickname} onProfileGenerated={applyAIProfile} />

        <div className="space-y-2">
          <label htmlFor="profession" className="block text-sm font-medium text-text-secondary">직군</label>
          <select id="profession" value={formData.profession} onChange={(e) => handleChange('profession', e.target.value)} className="w-full px-4 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary focus:border-accent focus:outline-none">
            <option value="">직군 선택</option>
            {CELEB_PROFESSIONS.map((prof) => <option key={prof.value} value={prof.value}>{prof.label}</option>)}
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="nationality" className="block text-sm font-medium text-text-secondary">국적</label>
          <select id="nationality" value={formData.nationality} onChange={(e) => handleChange('nationality', e.target.value)} disabled={countriesLoading} className="w-full px-4 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary focus:border-accent focus:outline-none disabled:opacity-50">
            <option value="">{countriesLoading ? '국가 목록 로딩 중...' : '국적 선택'}</option>
            {countries.map((country) => <option key={country.code} value={country.name}>{country.name}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label htmlFor="birth_date" className="block text-sm font-medium text-text-secondary">출생연일</label>
            <input type="text" id="birth_date" value={formData.birth_date} onChange={(e) => handleChange('birth_date', e.target.value)} placeholder="예: 1955-02-24, -356 (기원전)" className="w-full px-4 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary placeholder-text-secondary focus:border-accent focus:outline-none" />
          </div>
          <div className="space-y-2">
            <label htmlFor="death_date" className="block text-sm font-medium text-text-secondary">사망연일</label>
            <input type="text" id="death_date" value={formData.death_date} onChange={(e) => handleChange('death_date', e.target.value)} placeholder="예: 2011-10-05, -323 (기원전)" className="w-full px-4 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary placeholder-text-secondary focus:border-accent focus:outline-none" />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="bio" className="block text-sm font-medium text-text-secondary">소개</label>
          <textarea id="bio" rows={3} value={formData.bio} onChange={(e) => handleChange('bio', e.target.value)} placeholder="셀럽 소개글" className="w-full px-4 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary placeholder-text-secondary focus:border-accent focus:outline-none resize-none" />
        </div>

        <div className="space-y-2">
          <label htmlFor="quotes" className="block text-sm font-medium text-text-secondary">명언</label>
          <textarea id="quotes" rows={2} value={formData.quotes} onChange={(e) => handleChange('quotes', e.target.value)} placeholder="이 인물의 명언 또는 대표 발언" className="w-full px-4 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary placeholder-text-secondary focus:border-accent focus:outline-none resize-none" />
        </div>

        <div className="space-y-2">
          <label htmlFor="avatar_url" className="block text-sm font-medium text-text-secondary">프로필 URL (썸네일)</label>
          <input type="url" id="avatar_url" value={formData.avatar_url} onChange={(e) => handleChange('avatar_url', e.target.value)} placeholder="https://..." className="w-full px-4 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary placeholder-text-secondary focus:border-accent focus:outline-none" />
        </div>

        <div className="space-y-2">
          <label htmlFor="portrait_url" className="block text-sm font-medium text-text-secondary">초상화 URL (상세용)</label>
          <input type="url" id="portrait_url" value={formData.portrait_url} onChange={(e) => handleChange('portrait_url', e.target.value)} placeholder="https://..." className="w-full px-4 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary placeholder-text-secondary focus:border-accent focus:outline-none" />
        </div>

        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" checked={formData.is_verified} onChange={(e) => handleChange('is_verified', e.target.checked)} className="w-4 h-4 rounded border-border bg-bg-secondary text-accent focus:ring-accent" />
          <div className="flex items-center gap-2"><Star className="w-4 h-4 text-blue-400" /><span className="text-sm text-text-primary">공식 인증 계정</span></div>
        </label>

        {mode === 'edit' && (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-text-secondary">상태</label>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="status" value="active" checked={formData.status === 'active'} onChange={() => handleChange('status', 'active')} className="w-4 h-4" />
                <span className="text-sm text-text-primary">활성</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="status" value="suspended" checked={formData.status === 'suspended'} onChange={() => handleChange('status', 'suspended')} className="w-4 h-4" />
                <span className="text-sm text-text-primary">비활성</span>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Influence Card */}
      <div className="bg-bg-card border border-border rounded-lg p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-primary">영향력 평가</h2>
          <div className="flex items-center gap-3">
            <span className={`px-2 py-0.5 rounded text-xs font-bold ${RANK_COLORS[influence.rank]}`}>{influence.rank}등급 ({influence.totalScore}/100)</span>
            <button type="button" onClick={() => setInfluence(getEmptyInfluence())} className="p-1 text-text-secondary hover:text-text-primary" title="영향력 초기화"><X className="w-4 h-4" /></button>
          </div>
        </div>

        <div className="space-y-4">
          {Object.entries(INFLUENCE_LABELS).map(([key, { label, max }]) => {
            const field = influence[key as keyof typeof influence]
            if (typeof field === 'object' && 'score' in field) {
              return (
                <div key={key} className="space-y-2">
                  <div className="flex items-center gap-3">
                    <label className="w-24 text-sm text-text-secondary shrink-0">{label}</label>
                    <input type="number" min={0} max={max} value={field.score} onChange={(e) => handleInfluenceChange(key, 'score', Math.min(max, Math.max(0, parseInt(e.target.value) || 0)))} className="w-16 px-2 py-1 bg-bg-secondary border border-border rounded text-text-primary text-center text-sm focus:border-accent focus:outline-none" />
                    <span className="text-xs text-text-secondary">/ {max}</span>
                    <div className="flex-1 h-2 bg-bg-secondary rounded-full overflow-hidden"><div className="h-full bg-accent rounded-full" style={{ width: `${(field.score / max) * 100}%` }} /></div>
                  </div>
                  <input type="text" value={field.exp} onChange={(e) => handleInfluenceChange(key, 'exp', e.target.value)} placeholder={`${label} 설명 (선택)`} className="w-full px-3 py-1.5 bg-bg-secondary border border-border rounded text-text-primary text-sm placeholder-text-secondary focus:border-accent focus:outline-none" />
                </div>
              )
            }
            return null
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        {mode === 'edit' ? (
          <Button type="button" variant="danger" onClick={handleDelete} disabled={deleteLoading}>
            {deleteLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}계정 삭제
          </Button>
        ) : <div />}

        <div className="flex items-center gap-3">
          {mode === 'create' && <Button type="button" variant="secondary" onClick={() => router.push('/members?tab=celeb')}>취소</Button>}
          <Button type="submit" disabled={loading}>
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" />{mode === 'create' ? '생성 중...' : '저장 중...'}</> : mode === 'create' ? '생성' : '저장'}
          </Button>
        </div>
      </div>
    </form>
  )
}
