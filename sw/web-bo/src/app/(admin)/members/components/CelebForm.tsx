'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createCeleb, updateCeleb, deleteCeleb } from '@/actions/admin/celebs'
import { uploadCelebImage } from '@/actions/admin/storage'
import { calculateInfluenceRank, type GeneratedInfluence } from '@feelnnote/ai-services/celeb-profile'
import type { Member } from '@/actions/admin/members'
import { CELEB_PROFESSIONS } from '@/constants/celebCategories'
import { useCountries } from '@/hooks/useCountries'
import { Loader2, Trash2, Star, X, Upload, ImageIcon } from 'lucide-react'
import Button from '@/components/ui/Button'
import AIBasicProfileSection from './AIBasicProfileSection'
import AIInfluenceSection from './AIInfluenceSection'
import { resizeSingleImage, createPreviewUrl, type ImageType } from '@/lib/image'
import type { InfluenceScore } from '@feelnnote/ai-services/celeb-profile'
import ImageCropModal from '@/components/ui/ImageCropModal'

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

function getInitialInfluence(celeb?: Member): GeneratedInfluence {
  if (!celeb?.influence) return getEmptyInfluence()

  const inf = celeb.influence
  const totalScore = inf.total_score
  return {
    political: { score: inf.political, exp: inf.political_exp || '' },
    strategic: { score: inf.strategic, exp: inf.strategic_exp || '' },
    tech: { score: inf.tech, exp: inf.tech_exp || '' },
    social: { score: inf.social, exp: inf.social_exp || '' },
    economic: { score: inf.economic, exp: inf.economic_exp || '' },
    cultural: { score: inf.cultural, exp: inf.cultural_exp || '' },
    transhistoricity: { score: inf.transhistoricity, exp: inf.transhistoricity_exp || '' },
    totalScore,
    rank: calculateInfluenceRank(totalScore),
  }
}
// #endregion

export default function CelebForm({ mode, celeb }: Props) {
  const router = useRouter()
  const { countries, loading: countriesLoading } = useCountries()
  const [formData, setFormData] = useState<CelebFormData>(getInitialFormData(celeb))
  const [influence, setInfluence] = useState<GeneratedInfluence>(getInitialInfluence(celeb))
  const [guessedName, setGuessedName] = useState(celeb?.nickname || '')
  const [loading, setLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // 이미지 업로드 상태 (avatar: 썸네일, portrait: 초상화)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  const [portraitFile, setPortraitFile] = useState<File | null>(null)
  const [portraitPreview, setPortraitPreview] = useState<string | null>(null)
  const portraitInputRef = useRef<HTMLInputElement>(null)

  // 크롭 모달 상태
  const [cropModalOpen, setCropModalOpen] = useState(false)
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null)
  const [cropTargetType, setCropTargetType] = useState<ImageType>('avatar')

  // DND 상태
  const [avatarDragging, setAvatarDragging] = useState(false)
  const [portraitDragging, setPortraitDragging] = useState(false)

  // #region AI 프로필 적용
  type InfluenceField = 'political' | 'strategic' | 'tech' | 'social' | 'economic' | 'cultural' | 'transhistoricity'

  function applyBasicProfile(fields: {
    fullname?: string
    profession?: string
    nationality?: string
    birthDate?: string
    deathDate?: string
    bio?: string
    quotes?: string
  }) {
    setFormData((prev) => ({
      ...prev,
      ...(fields.fullname && { nickname: fields.fullname }),
      ...(fields.profession && { profession: fields.profession }),
      ...(fields.nationality && { nationality: fields.nationality }),
      ...(fields.birthDate && { birth_date: fields.birthDate }),
      ...(fields.deathDate && { death_date: fields.deathDate }),
      ...(fields.bio && { bio: fields.bio }),
      ...(fields.quotes && { quotes: fields.quotes }),
    }))
  }

  function applyInfluence(fields: Partial<Record<InfluenceField, InfluenceScore>>) {
    setInfluence((prev) => {
      const updated: GeneratedInfluence = {
        political: fields.political || prev.political,
        strategic: fields.strategic || prev.strategic,
        tech: fields.tech || prev.tech,
        social: fields.social || prev.social,
        economic: fields.economic || prev.economic,
        cultural: fields.cultural || prev.cultural,
        transhistoricity: fields.transhistoricity || prev.transhistoricity,
        totalScore: 0,
        rank: 'D',
      }
      // totalScore 재계산
      const totalScore =
        updated.political.score +
        updated.strategic.score +
        updated.tech.score +
        updated.social.score +
        updated.economic.score +
        updated.cultural.score +
        updated.transhistoricity.score
      return { ...updated, totalScore, rank: calculateInfluenceRank(totalScore) }
    })
  }
  // #endregion

  function handleChange(field: keyof CelebFormData, value: string | boolean) {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  async function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>, type: ImageType) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('이미지 파일만 업로드 가능합니다.')
      return
    }

    // 크롭 모달 열기
    const preview = await createPreviewUrl(file)
    setCropImageSrc(preview)
    setCropTargetType(type)
    setCropModalOpen(true)

    // input 초기화 (같은 파일 재선택 가능하도록)
    e.target.value = ''
  }

  async function handleCropComplete(croppedDataUrl: string) {
    setCropModalOpen(false)

    // dataURL을 File로 변환
    const response = await fetch(croppedDataUrl)
    const blob = await response.blob()
    const file = new File([blob], `${cropTargetType}.webp`, { type: 'image/webp' })

    if (cropTargetType === 'avatar') {
      setAvatarFile(file)
      setAvatarPreview(croppedDataUrl)
    } else {
      setPortraitFile(file)
      setPortraitPreview(croppedDataUrl)
    }
  }

  function handleCropCancel() {
    setCropModalOpen(false)
    setCropImageSrc(null)
  }

  function handleImageRemove(type: ImageType) {
    if (type === 'avatar') {
      setAvatarFile(null)
      setAvatarPreview(null)
      if (avatarInputRef.current) avatarInputRef.current.value = ''
    } else {
      setPortraitFile(null)
      setPortraitPreview(null)
      if (portraitInputRef.current) portraitInputRef.current.value = ''
    }
  }

  // #region DND 핸들러
  function handleDragOver(e: React.DragEvent, type: ImageType) {
    e.preventDefault()
    e.stopPropagation()
    if (type === 'avatar') setAvatarDragging(true)
    else setPortraitDragging(true)
  }

  function handleDragLeave(e: React.DragEvent, type: ImageType) {
    e.preventDefault()
    e.stopPropagation()
    if (type === 'avatar') setAvatarDragging(false)
    else setPortraitDragging(false)
  }

  async function handleDrop(e: React.DragEvent, type: ImageType) {
    e.preventDefault()
    e.stopPropagation()
    if (type === 'avatar') setAvatarDragging(false)
    else setPortraitDragging(false)

    const file = e.dataTransfer.files?.[0]
    if (!file || !file.type.startsWith('image/')) {
      setError('이미지 파일만 업로드 가능합니다.')
      return
    }

    // 크롭 모달 열기
    const preview = await createPreviewUrl(file)
    setCropImageSrc(preview)
    setCropTargetType(type)
    setCropModalOpen(true)
  }
  // #endregion

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
      return { ...updated, totalScore, rank: calculateInfluenceRank(totalScore) }
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
      let avatarUrl = formData.avatar_url || undefined
      let portraitUrl = formData.portrait_url || undefined

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
          avatar_url: avatarUrl,
          portrait_url: portraitUrl,
          is_verified: formData.is_verified,
          influence: hasInfluence ? influence : undefined,
        })

        // 생성 후 이미지 업로드 (celebId가 필요하므로)
        const uploadPromises: Promise<void>[] = []

        if (avatarFile) {
          uploadPromises.push(
            resizeSingleImage(avatarFile, 'avatar').then(async (resized) => {
              const uploadResult = await uploadCelebImage({ celebId: result.id, image: resized, type: 'avatar' })
              if (uploadResult.success) avatarUrl = uploadResult.url
            })
          )
        }

        if (portraitFile) {
          uploadPromises.push(
            resizeSingleImage(portraitFile, 'portrait').then(async (resized) => {
              const uploadResult = await uploadCelebImage({ celebId: result.id, image: resized, type: 'portrait' })
              if (uploadResult.success) portraitUrl = uploadResult.url
            })
          )
        }

        if (uploadPromises.length > 0) {
          await Promise.all(uploadPromises)
          await updateCeleb({ id: result.id, avatar_url: avatarUrl, portrait_url: portraitUrl })
        }

        router.push(`/members/${result.id}`)
      } else if (celeb) {
        // 개별 이미지 업로드
        if (avatarFile) {
          const resized = await resizeSingleImage(avatarFile, 'avatar')
          const uploadResult = await uploadCelebImage({ celebId: celeb.id, image: resized, type: 'avatar' })
          if (uploadResult.success) avatarUrl = uploadResult.url
          else throw new Error(uploadResult.error || '아바타 업로드 실패')
        }

        if (portraitFile) {
          const resized = await resizeSingleImage(portraitFile, 'portrait')
          const uploadResult = await uploadCelebImage({ celebId: celeb.id, image: resized, type: 'portrait' })
          if (uploadResult.success) portraitUrl = uploadResult.url
          else throw new Error(uploadResult.error || '초상화 업로드 실패')
        }

        const hasInfluence = influence.totalScore > 0
        await updateCeleb({
          id: celeb.id,
          nickname: formData.nickname.trim(),
          profession: formData.profession || undefined,
          nationality: formData.nationality || undefined,
          birth_date: formData.birth_date || undefined,
          death_date: formData.death_date || undefined,
          bio: formData.bio || undefined,
          quotes: formData.quotes || undefined,
          avatar_url: avatarUrl,
          portrait_url: portraitUrl,
          is_verified: formData.is_verified,
          status: formData.status,
          influence: hasInfluence ? influence : undefined,
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
    <>
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400 text-sm">{error}</div>}
      {success && <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 text-green-400 text-sm">저장되었습니다.</div>}

      {/* Basic Info */}
      <div className="bg-bg-card border border-border rounded-lg p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-primary">{mode === 'create' ? '기본 정보' : '프로필 수정'}</h2>
        </div>

        {/* 추정 닉네임 입력 (AI 검색용) */}
        <div className="bg-accent/5 border border-accent/20 rounded-lg p-4 space-y-2">
          <label htmlFor="guessed-name" className="block text-sm font-medium text-text-primary">
            추정 닉네임 <span className="text-xs text-text-secondary font-normal">(AI 검색용)</span>
          </label>
          <input
            type="text"
            id="guessed-name"
            value={guessedName}
            onChange={(e) => setGuessedName(e.target.value)}
            placeholder="예: Elon Musk, 일론 머스크, 테슬라 CEO..."
            className="w-full px-4 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary placeholder-text-secondary focus:border-accent focus:outline-none"
          />
          <p className="text-xs text-text-secondary">실제 닉네임과 다를 수 있는 추정 이름을 입력하면 AI가 정확한 정보를 검색한다.</p>
        </div>

        <AIBasicProfileSection guessedName={guessedName} onApply={applyBasicProfile} />

        {/* 인라인 입력 필드 그리드 */}
        <div className="grid grid-cols-[100px_1fr] gap-x-4 gap-y-3 items-center">
          <label htmlFor="nickname" className="text-sm font-medium text-text-secondary">닉네임 <span className="text-red-400">*</span></label>
          <input type="text" id="nickname" required value={formData.nickname} onChange={(e) => handleChange('nickname', e.target.value)} placeholder="셀럽 닉네임" className="px-4 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary placeholder-text-secondary focus:border-accent focus:outline-none" />

          <label htmlFor="profession" className="text-sm font-medium text-text-secondary">직군</label>
          <select id="profession" value={formData.profession} onChange={(e) => handleChange('profession', e.target.value)} className="px-4 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary focus:border-accent focus:outline-none">
            <option value="">직군 선택</option>
            {CELEB_PROFESSIONS.map((prof) => <option key={prof.value} value={prof.value}>{prof.label}</option>)}
          </select>

          <label htmlFor="nationality" className="text-sm font-medium text-text-secondary">국적</label>
          <select id="nationality" value={formData.nationality} onChange={(e) => handleChange('nationality', e.target.value)} disabled={countriesLoading} className="px-4 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary focus:border-accent focus:outline-none disabled:opacity-50">
            <option value="">{countriesLoading ? '로딩 중...' : '국적 선택'}</option>
            {countries.map((country) => <option key={country.code} value={country.code}>{country.name}</option>)}
          </select>

          <label htmlFor="birth_date" className="text-sm font-medium text-text-secondary">출생</label>
          <div className="grid grid-cols-2 gap-4">
            <input type="text" id="birth_date" value={formData.birth_date} onChange={(e) => handleChange('birth_date', e.target.value)} placeholder="1955-02-24 또는 -356" className="px-4 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary placeholder-text-secondary focus:border-accent focus:outline-none" />
            <input type="text" id="death_date" value={formData.death_date} onChange={(e) => handleChange('death_date', e.target.value)} placeholder="사망일 (생존시 공백)" className="px-4 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary placeholder-text-secondary focus:border-accent focus:outline-none" />
          </div>

          <label htmlFor="bio" className="text-sm font-medium text-text-secondary self-start pt-2">소개</label>
          <textarea id="bio" rows={2} value={formData.bio} onChange={(e) => handleChange('bio', e.target.value)} placeholder="셀럽 소개글" className="px-4 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary placeholder-text-secondary focus:border-accent focus:outline-none resize-none" />

          <label htmlFor="quotes" className="text-sm font-medium text-text-secondary self-start pt-2">명언</label>
          <textarea id="quotes" rows={2} value={formData.quotes} onChange={(e) => handleChange('quotes', e.target.value)} placeholder="대표 명언 또는 발언" className="px-4 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary placeholder-text-secondary focus:border-accent focus:outline-none resize-none" />
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

      {/* Profile Image Card */}
      <div className="bg-bg-card border border-border rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold text-text-primary">프로필 이미지</h2>
        <p className="text-sm text-text-secondary">이미지를 드래그 앤 드롭하거나 클릭하여 업로드</p>

        <div className="grid grid-cols-2 gap-6">
          {/* 썸네일 (3:4) */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-text-secondary">썸네일 <span className="text-xs font-normal">(300×400)</span></p>
            <div
              onDragOver={(e) => handleDragOver(e, 'avatar')}
              onDragLeave={(e) => handleDragLeave(e, 'avatar')}
              onDrop={(e) => handleDrop(e, 'avatar')}
              onClick={() => avatarInputRef.current?.click()}
              className={`relative flex flex-col items-center justify-center gap-3 p-6 border-2 border-dashed rounded-xl cursor-pointer hover:border-accent/50 hover:bg-accent/5 ${avatarDragging ? 'border-accent bg-accent/10' : 'border-border'}`}
            >
              <input ref={avatarInputRef} type="file" accept="image/*" onChange={(e) => handleImageSelect(e, 'avatar')} className="hidden" />

              {(avatarPreview || formData.avatar_url) ? (
                <div className="relative w-[90px] h-[120px] rounded-lg overflow-hidden">
                  <Image src={avatarPreview || formData.avatar_url || ''} alt="썸네일" fill unoptimized className="object-cover" />
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleImageRemove('avatar') }}
                    className="absolute top-1 right-1 p-1 bg-black/60 rounded-full hover:bg-black/80"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-full bg-bg-secondary flex items-center justify-center">
                    <Upload className="w-6 h-6 text-text-secondary" />
                  </div>
                  <span className="text-sm text-text-secondary">클릭 또는 드래그</span>
                </>
              )}
            </div>
            <input
              type="url"
              value={formData.avatar_url}
              onChange={(e) => handleChange('avatar_url', e.target.value)}
              placeholder="또는 이미지 URL 입력"
              className="w-full px-3 py-2 text-sm bg-bg-secondary border border-border rounded-lg text-text-primary placeholder-text-secondary focus:border-accent focus:outline-none"
            />
          </div>

          {/* 초상화 (9:16) */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-text-secondary">초상화 <span className="text-xs font-normal">(675×1200)</span></p>
            <div
              onDragOver={(e) => handleDragOver(e, 'portrait')}
              onDragLeave={(e) => handleDragLeave(e, 'portrait')}
              onDrop={(e) => handleDrop(e, 'portrait')}
              onClick={() => portraitInputRef.current?.click()}
              className={`relative flex flex-col items-center justify-center gap-3 p-6 border-2 border-dashed rounded-xl cursor-pointer hover:border-accent/50 hover:bg-accent/5 ${portraitDragging ? 'border-accent bg-accent/10' : 'border-border'}`}
            >
              <input ref={portraitInputRef} type="file" accept="image/*" onChange={(e) => handleImageSelect(e, 'portrait')} className="hidden" />

              {(portraitPreview || formData.portrait_url) ? (
                <div className="relative w-[68px] h-[120px] rounded-xl overflow-hidden">
                  <Image src={portraitPreview || formData.portrait_url || ''} alt="초상화" fill unoptimized className="object-cover" />
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleImageRemove('portrait') }}
                    className="absolute top-1 right-1 p-1 bg-black/60 rounded-full hover:bg-black/80"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-full bg-bg-secondary flex items-center justify-center">
                    <Upload className="w-6 h-6 text-text-secondary" />
                  </div>
                  <span className="text-sm text-text-secondary">클릭 또는 드래그</span>
                </>
              )}
            </div>
            <input
              type="url"
              value={formData.portrait_url}
              onChange={(e) => handleChange('portrait_url', e.target.value)}
              placeholder="또는 이미지 URL 입력"
              className="w-full px-3 py-2 text-sm bg-bg-secondary border border-border rounded-lg text-text-primary placeholder-text-secondary focus:border-accent focus:outline-none"
            />
          </div>
        </div>
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

        <AIInfluenceSection guessedName={guessedName} onApply={applyInfluence} />

        <div className="space-y-2">
          {Object.entries(INFLUENCE_LABELS).map(([key, { label, max }]) => {
            const field = influence[key as keyof typeof influence]
            if (typeof field === 'object' && 'score' in field) {
              return (
                <div key={key} className="flex items-center gap-3">
                  <label className="w-20 text-sm text-text-secondary shrink-0">{label}</label>
                  <input type="number" min={0} max={max} value={field.score} onChange={(e) => handleInfluenceChange(key, 'score', Math.min(max, Math.max(0, parseInt(e.target.value) || 0)))} className="w-14 px-2 py-1 bg-bg-secondary border border-border rounded text-text-primary text-center text-sm focus:border-accent focus:outline-none" />
                  <span className="text-xs text-text-secondary w-8">/{max}</span>
                  <div className="w-24 h-1.5 bg-bg-secondary rounded-full overflow-hidden shrink-0"><div className="h-full bg-accent rounded-full" style={{ width: `${(field.score / max) * 100}%` }} /></div>
                  <input type="text" value={field.exp} onChange={(e) => handleInfluenceChange(key, 'exp', e.target.value)} placeholder="설명" className="flex-1 px-3 py-1 bg-bg-secondary border border-border rounded text-text-primary text-sm placeholder-text-secondary focus:border-accent focus:outline-none" />
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

    {/* 이미지 크롭 모달 */}
    {cropModalOpen && cropImageSrc && (
      <ImageCropModal
        imageSrc={cropImageSrc}
        aspectRatio={cropTargetType === 'avatar' ? 3 / 4 : 9 / 16}
        onComplete={handleCropComplete}
        onCancel={handleCropCancel}
      />
    )}
    </>
  )
}
