'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createCeleb, updateCeleb, deleteCeleb } from '@/actions/admin/celebs'
import { uploadCelebImage } from '@/actions/admin/storage'
import { getCelebTags, updateCelebTags, type CelebTagInput } from '@/actions/admin/tags'
import { calculateInfluenceRank, type GeneratedInfluence } from '@feelandnote/ai-services/celeb-profile'
import type { Member } from '@/actions/admin/members'
import { CELEB_PROFESSIONS } from '@/constants/celebCategories'
import { useCountries } from '@/hooks/useCountries'
import { Loader2, Trash2, Star, X, Upload, ChevronDown, ChevronUp } from 'lucide-react'
import Button from '@/components/ui/Button'
import { useToast } from '@/contexts/ToastContext'
import { resizeSingleImage, createPreviewUrl } from '@/lib/image'
import ImageCropModal from '@/components/ui/ImageCropModal'
import CelebTagSelector from './CelebTagSelector'
import FormattedText from '@/components/ui/FormattedText'
import { useLangMode, type LangMode } from '@/contexts/LangModeContext'

// #region Types
interface CelebFormData {
  nickname: string
  nickname_en: string
  profession: string
  title: string
  title_en: string
  nationality: string
  gender: boolean | null
  birth_date: string
  death_date: string
  bio: string
  bio_en: string
  avatar_url: string
  is_verified: boolean
  status: 'active' | 'suspended'
  celeb_tier: 'full' | 'light'
  cultural_journey: string
  cultural_journey_en: string
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

// #region CSS Constants
const INPUT_CLS = 'px-3 py-1.5 text-sm bg-bg-secondary border border-border rounded-lg text-text-primary placeholder-text-secondary focus:border-accent focus:outline-none'
const INPUT_EN_CLS = 'px-3 py-1.5 text-xs bg-bg-secondary border border-border/60 rounded-lg text-text-primary placeholder-blue-400/50 focus:border-blue-400/50 focus:outline-none'
const TEXTAREA_CLS = 'w-full px-3 py-2 text-sm bg-bg-secondary border border-border rounded-lg text-text-primary placeholder-text-secondary focus:border-accent focus:outline-none resize-none'
const TEXTAREA_EN_CLS = 'w-full px-3 py-2 text-xs bg-bg-secondary border border-border/60 rounded-lg text-text-primary placeholder-blue-400/50 focus:border-blue-400/50 focus:outline-none resize-none'
// #endregion

// #region BilingualInput
function BilingualInput({ mode, ko, en }: { mode: LangMode; ko: React.ReactNode; en: React.ReactNode }) {
  if (mode === 'ko') return <>{ko}</>
  if (mode === 'en') return <>{en}</>
  return (
    <div className="grid grid-cols-2 gap-2">
      {ko}
      {en}
    </div>
  )
}
// #endregion

// #region Helpers
function getInitialFormData(celeb?: Member): CelebFormData {
  return {
    nickname: celeb?.nickname || '',
    nickname_en: celeb?.nickname_en || '',
    profession: celeb?.profession || '',
    title: celeb?.title || '',
    title_en: celeb?.title_en || '',
    nationality: celeb?.nationality || '',
    gender: celeb?.gender ?? null,
    birth_date: celeb?.birth_date || '',
    death_date: celeb?.death_date || '',
    bio: celeb?.bio || '',
    bio_en: celeb?.bio_en || '',
    avatar_url: celeb?.avatar_url || '',
    is_verified: celeb?.is_verified || false,
    status: (celeb?.status as 'active' | 'suspended') || 'suspended',
    celeb_tier: (celeb?.celeb_tier as 'full' | 'light') || 'full',
    cultural_journey: celeb?.cultural_journey || '',
    cultural_journey_en: celeb?.cultural_journey_en || '',
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
  const { showToast } = useToast()
  const langMode = useLangMode()
  const { countries, loading: countriesLoading } = useCountries()
  const [formData, setFormData] = useState<CelebFormData>(getInitialFormData(celeb))
  const [influence, setInfluence] = useState<GeneratedInfluence>(getInitialInfluence(celeb))
  const [loading, setLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 이미지 업로드 상태
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  // 크롭 모달 상태
  const [cropModalOpen, setCropModalOpen] = useState(false)
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null)

  // 감상 편력 textarea ref (자동 높이 조절용)
  const philosophyTextareaRef = useRef<HTMLTextAreaElement>(null)

  // DND 상태
  const [avatarDragging, setAvatarDragging] = useState(false)

  // 섹션 접힘 상태
  const [openSections, setOpenSections] = useState({
    basicInfo: true,
    influence: false,
    philosophy: false,
    tags: false,
  })

  function toggleSection(key: keyof typeof openSections) {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }))
  }

  // 파일명 → 인물명 자동 입력 토글 (localStorage 연동)
  const [autoNameFromFile, setAutoNameFromFile] = useState(() => {
    if (typeof window === 'undefined') return true
    return localStorage.getItem('celeb-auto-name') !== 'false'
  })

  // 이탈 방지용 초기값 저장
  const initialFormData = useRef(getInitialFormData(celeb))
  const initialInfluence = useRef(getInitialInfluence(celeb))
  const [isSaved, setIsSaved] = useState(false)

  // 태그 상태 (short_desc, long_desc 포함)
  const [selectedTags, setSelectedTags] = useState<CelebTagInput[]>([])
  const initialTags = useRef<CelebTagInput[]>([])

  // isDirty 계산 - 폼 데이터가 변경되었는지 확인
  const isDirty = useCallback(() => {
    if (isSaved) return false
    const formChanged = JSON.stringify(formData) !== JSON.stringify(initialFormData.current)
    const influenceChanged = JSON.stringify(influence) !== JSON.stringify(initialInfluence.current)
    const hasNewImages = avatarFile !== null
    const tagsChanged = JSON.stringify(selectedTags) !== JSON.stringify(initialTags.current)
    return formChanged || influenceChanged || hasNewImages || tagsChanged
  }, [formData, influence, avatarFile, isSaved, selectedTags])

  // beforeunload 이벤트 - 브라우저 이탈 방지
  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (isDirty()) {
        e.preventDefault()
        return ''
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isDirty])

  // 편집 모드 시 태그 로딩
  useEffect(() => {
    if (mode === 'edit' && celeb) {
      getCelebTags(celeb.id).then(tags => {
        const tagsWithDesc = tags.map(t => ({ tagId: t.id, short_desc: t.short_desc, long_desc: t.long_desc }))
        setSelectedTags(tagsWithDesc)
        initialTags.current = tagsWithDesc
      })
    }
  }, [mode, celeb])

  // 감상 편력 textarea 자동 높이 조절
  const adjustPhilosophyHeight = useCallback(() => {
    const textarea = philosophyTextareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${textarea.scrollHeight}px`
    }
  }, [])

  useEffect(() => {
    adjustPhilosophyHeight()
  }, [formData.cultural_journey, adjustPhilosophyHeight])

  // 화면 리사이즈 시 높이 재조정
  useEffect(() => {
    window.addEventListener('resize', adjustPhilosophyHeight)
    return () => window.removeEventListener('resize', adjustPhilosophyHeight)
  }, [adjustPhilosophyHeight])

  function toggleAutoName() {
    setAutoNameFromFile(prev => {
      const next = !prev
      localStorage.setItem('celeb-auto-name', String(next))
      return next
    })
  }

  // 파일명에서 인물명 추출 → nickname 자동 입력
  function applyFileNameAsNickname(file: File) {
    if (!autoNameFromFile || formData.nickname.trim()) return
    const name = file.name.replace(/\.[^.]+$/, '').trim()
    if (name) setFormData(prev => ({ ...prev, nickname: name }))
  }

  function handleChange(field: keyof CelebFormData, value: string | boolean | null) {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  async function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('이미지 파일만 업로드 가능합니다.')
      return
    }

    applyFileNameAsNickname(file)

    const preview = await createPreviewUrl(file)
    setCropImageSrc(preview)
    setCropModalOpen(true)

    // input 초기화 (같은 파일 재선택 가능하도록)
    e.target.value = ''
  }

  async function handleCropComplete(croppedDataUrl: string) {
    setCropModalOpen(false)

    // dataURL을 File로 변환
    const response = await fetch(croppedDataUrl)
    const blob = await response.blob()
    const file = new File([blob], 'avatar.webp', { type: 'image/webp' })

    setAvatarFile(file)
    setAvatarPreview(croppedDataUrl)
  }

  function handleCropCancel() {
    setCropModalOpen(false)
    setCropImageSrc(null)
  }

  function handleImageRemove() {
    setAvatarFile(null)
    setAvatarPreview(null)
    if (avatarInputRef.current) avatarInputRef.current.value = ''
  }

  // #region DND 핸들러
  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setAvatarDragging(true)
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setAvatarDragging(false)
  }

  async function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setAvatarDragging(false)

    const file = e.dataTransfer.files?.[0]
    if (!file || !file.type.startsWith('image/')) {
      setError('이미지 파일만 업로드 가능합니다.')
      return
    }

    applyFileNameAsNickname(file)

    const preview = await createPreviewUrl(file)
    setCropImageSrc(preview)
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

    if (!formData.nickname.trim()) {
      setError('닉네임을 입력해주세요.')
      setLoading(false)
      return
    }

    try {
      let avatarUrl = formData.avatar_url || undefined

      if (mode === 'create') {
        const hasInfluence = influence.totalScore > 0
        const result = await createCeleb({
          nickname: formData.nickname.trim(),
          profession: formData.profession || undefined,
          title: formData.title || undefined,
          nationality: formData.nationality || undefined,
          gender: formData.gender,
          birth_date: formData.birth_date || undefined,
          death_date: formData.death_date || undefined,
          bio: formData.bio || undefined,
          avatar_url: avatarUrl,
          is_verified: formData.is_verified,
          status: formData.status,
          cultural_journey: formData.cultural_journey || undefined,
          influence: hasInfluence ? influence : undefined,
        })

        // 생성 후 이미지 업로드 (celebId가 필요하므로)
        if (avatarFile) {
          const resized = await resizeSingleImage(avatarFile, 'avatar')
          const uploadResult = await uploadCelebImage({ celebId: result.id, image: resized, type: 'avatar' })
          if (uploadResult.success) avatarUrl = uploadResult.url
          await updateCeleb({ id: result.id, avatar_url: avatarUrl })
        }

        // 태그 저장 (생성 시)
        if (selectedTags.length > 0) {
          await updateCelebTags(result.id, selectedTags)
        }

        setIsSaved(true)
        router.push(`/members/${result.id}`)
      } else if (celeb) {
        // 개별 이미지 업로드
        if (avatarFile) {
          const resized = await resizeSingleImage(avatarFile, 'avatar')
          const uploadResult = await uploadCelebImage({ celebId: celeb.id, image: resized, type: 'avatar' })
          if (uploadResult.success) avatarUrl = uploadResult.url
          else throw new Error(uploadResult.error || '아바타 업로드 실패')
        }

        const hasInfluence = influence.totalScore > 0
        await updateCeleb({
          id: celeb.id,
          nickname: formData.nickname.trim(),
          nickname_en: formData.nickname_en,
          profession: formData.profession || undefined,
          title: formData.title || undefined,
          title_en: formData.title_en,
          nationality: formData.nationality || undefined,
          gender: formData.gender,
          birth_date: formData.birth_date || undefined,
          death_date: formData.death_date || undefined,
          bio: formData.bio || undefined,
          bio_en: formData.bio_en,
          avatar_url: avatarUrl,
          is_verified: formData.is_verified,
          status: formData.status,
          celeb_tier: formData.celeb_tier,
          cultural_journey: formData.cultural_journey || undefined,
          cultural_journey_en: formData.cultural_journey_en,
          influence: hasInfluence ? influence : undefined,
        })

        // 태그 저장
        await updateCelebTags(celeb.id, selectedTags)

        // 저장 후 초기값 업데이트 (isDirty 리셋)
        const updatedFormData = { ...formData, avatar_url: avatarUrl || '' }
        initialFormData.current = updatedFormData
        initialInfluence.current = influence
        initialTags.current = selectedTags
        setFormData(updatedFormData)
        setAvatarFile(null)

        showToast('success', '저장되었습니다.')
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
    <form id="celeb-form" onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">{error}</div>}

      {/* Basic Info */}
      <div className="bg-bg-card border border-border rounded-lg overflow-hidden">
        <button type="button" onClick={() => toggleSection('basicInfo')} className="w-full p-4 flex items-center justify-between hover:bg-white/5">
          <h2 className="text-base font-semibold text-text-primary">기본정보</h2>
          <div className="flex items-center gap-3">
            {!openSections.basicInfo && (formData.profession || formData.nationality) && (
              <span className="text-xs text-text-secondary truncate max-w-[200px]">
                {[CELEB_PROFESSIONS.find(p => p.value === formData.profession)?.label, formData.nationality].filter(Boolean).join(' · ')}
              </span>
            )}
            {openSections.basicInfo ? <ChevronUp className="w-5 h-5 text-text-secondary" /> : <ChevronDown className="w-5 h-5 text-text-secondary" />}
          </div>
        </button>
        {openSections.basicInfo && (
        <div className="px-4 pb-4">
          <div className="grid grid-cols-[80px_1fr] gap-x-3 gap-y-2 items-center text-sm">
            <label htmlFor="nickname" className="text-xs font-medium text-text-secondary">닉네임 <span className="text-red-400">*</span></label>
            <BilingualInput
              mode={langMode}
              ko={<input type="text" id="nickname" required value={formData.nickname} onChange={(e) => handleChange('nickname', e.target.value)} placeholder="셀럽 닉네임" className={INPUT_CLS} />}
              en={<input type="text" value={formData.nickname_en} onChange={(e) => handleChange('nickname_en', e.target.value)} placeholder="EN: English name" className={INPUT_EN_CLS} />}
            />

            <label htmlFor="profession" className="text-xs font-medium text-text-secondary">직군</label>
            <select id="profession" value={formData.profession} onChange={(e) => handleChange('profession', e.target.value)} className="px-3 py-1.5 text-sm bg-bg-secondary border border-border rounded-lg text-text-primary focus:border-accent focus:outline-none">
              <option value="">직군 선택</option>
              {CELEB_PROFESSIONS.map((prof) => <option key={prof.value} value={prof.value}>{prof.label}</option>)}
            </select>

            <label htmlFor="title" className="text-xs font-medium text-text-secondary">수식어</label>
            <BilingualInput
              mode={langMode}
              ko={<input type="text" id="title" value={formData.title} onChange={(e) => handleChange('title', e.target.value)} placeholder="예: 테슬라 창립자, 철의 여인" className={INPUT_CLS} />}
              en={<input type="text" value={formData.title_en} onChange={(e) => handleChange('title_en', e.target.value)} placeholder="EN: e.g. Iron Lady" className={INPUT_EN_CLS} />}
            />

            <label htmlFor="nationality" className="text-xs font-medium text-text-secondary">국적</label>
            <select id="nationality" value={formData.nationality} onChange={(e) => handleChange('nationality', e.target.value)} disabled={countriesLoading} className="px-3 py-1.5 text-sm bg-bg-secondary border border-border rounded-lg text-text-primary focus:border-accent focus:outline-none disabled:opacity-50">
              <option value="">{countriesLoading ? '로딩 중...' : '국적 선택'}</option>
              {countries.map((country) => <option key={country.code} value={country.code}>{country.name}</option>)}
            </select>

            <label htmlFor="gender" className="text-xs font-medium text-text-secondary">성별</label>
            <select id="gender" value={formData.gender === null ? '' : formData.gender ? 'male' : 'female'} onChange={(e) => handleChange('gender', e.target.value === '' ? null : e.target.value === 'male')} className="px-3 py-1.5 text-sm bg-bg-secondary border border-border rounded-lg text-text-primary focus:border-accent focus:outline-none">
              <option value="">선택 안함</option>
              <option value="male">남성</option>
              <option value="female">여성</option>
            </select>

            <label htmlFor="birth_date" className="text-xs font-medium text-text-secondary">출생</label>
            <div className="grid grid-cols-2 gap-2">
              <input type="text" id="birth_date" value={formData.birth_date} onChange={(e) => handleChange('birth_date', e.target.value)} placeholder="1955-02-24 또는 -356" className="px-3 py-1.5 text-sm bg-bg-secondary border border-border rounded-lg text-text-primary placeholder-text-secondary focus:border-accent focus:outline-none" />
              <input type="text" id="death_date" value={formData.death_date} onChange={(e) => handleChange('death_date', e.target.value)} placeholder="사망일 (생존시 공백)" className="px-3 py-1.5 text-sm bg-bg-secondary border border-border rounded-lg text-text-primary placeholder-text-secondary focus:border-accent focus:outline-none" />
            </div>

            <label htmlFor="bio" className="text-xs font-medium text-text-secondary self-start pt-1">소개</label>
            <BilingualInput
              mode={langMode}
              ko={<textarea id="bio" rows={2} value={formData.bio} onChange={(e) => handleChange('bio', e.target.value)} placeholder="셀럽 소개글" className={TEXTAREA_CLS} />}
              en={<textarea rows={2} value={formData.bio_en} onChange={(e) => handleChange('bio_en', e.target.value)} placeholder="EN: English bio" className={TEXTAREA_EN_CLS} />}
            />

            <label className="text-xs font-medium text-text-secondary self-start pt-1">썸네일</label>
            <div className="flex items-start gap-3">
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => avatarInputRef.current?.click()}
                className={`relative flex flex-col items-center justify-center gap-1 w-[100px] h-[100px] shrink-0 border-2 border-dashed rounded-xl cursor-pointer hover:border-accent/50 hover:bg-accent/5 ${avatarDragging ? 'border-accent bg-accent/10' : 'border-border'}`}
              >
                <input ref={avatarInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
                {(avatarPreview || formData.avatar_url) ? (
                  <div className="relative w-full h-full rounded-lg overflow-hidden">
                    <Image src={avatarPreview || formData.avatar_url || ''} alt="썸네일" fill unoptimized className="object-cover" />
                    <button type="button" onClick={(e) => { e.stopPropagation(); handleImageRemove() }} className="absolute top-1 right-1 p-0.5 bg-black/60 rounded-full hover:bg-black/80">
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ) : (
                  <>
                    <Upload className="w-4 h-4 text-text-secondary" />
                    <span className="text-[10px] text-text-secondary">300×300</span>
                  </>
                )}
              </div>
              <div className="flex-1 space-y-1.5 min-w-0">
                <input
                  type="url"
                  value={formData.avatar_url}
                  onChange={(e) => handleChange('avatar_url', e.target.value)}
                  placeholder="이미지 URL 직접 입력"
                  className="w-full px-2 py-1.5 text-xs bg-bg-secondary border border-border rounded-lg text-text-primary placeholder-text-secondary focus:border-accent focus:outline-none"
                />
                <label className="flex items-center gap-1.5 cursor-pointer" onClick={e => e.stopPropagation()}>
                  <input type="checkbox" checked={autoNameFromFile} onChange={toggleAutoName} className="w-3 h-3 rounded border-border bg-bg-secondary text-accent focus:ring-accent" />
                  <span className="text-[10px] text-text-secondary">파일명 → 인물명</span>
                </label>
              </div>
            </div>

            <label className="text-xs font-medium text-text-secondary">옵션</label>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={formData.is_verified} onChange={(e) => handleChange('is_verified', e.target.checked)} className="w-3.5 h-3.5 rounded border-border bg-bg-secondary text-accent focus:ring-accent" />
                <div className="flex items-center gap-1"><Star className="w-3 h-3 text-blue-400" /><span className="text-xs text-text-primary">인증</span></div>
              </label>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1 cursor-pointer">
                  <input type="radio" name="status" value="active" checked={formData.status === 'active'} onChange={() => handleChange('status', 'active')} className="w-3 h-3" />
                  <span className="text-xs text-text-primary">활성</span>
                </label>
                <label className="flex items-center gap-1 cursor-pointer">
                  <input type="radio" name="status" value="suspended" checked={formData.status === 'suspended'} onChange={() => handleChange('status', 'suspended')} className="w-3 h-3" />
                  <span className="text-xs text-text-primary">비활성</span>
                </label>
              </div>
              <div className="flex items-center gap-2 border-l border-border pl-4">
                <label className="flex items-center gap-1 cursor-pointer">
                  <input type="radio" name="celeb_tier" value="full" checked={formData.celeb_tier === 'full'} onChange={() => handleChange('celeb_tier', 'full')} className="w-3 h-3" />
                  <span className="text-xs text-text-primary">full</span>
                </label>
                <label className="flex items-center gap-1 cursor-pointer">
                  <input type="radio" name="celeb_tier" value="light" checked={formData.celeb_tier === 'light'} onChange={() => handleChange('celeb_tier', 'light')} className="w-3 h-3" />
                  <span className="text-xs font-mono text-orange-400">light</span>
                </label>
              </div>
            </div>
          </div>
        </div>
        )}
      </div>

      {/* Influence Card */}
      <div className="bg-bg-card border border-border rounded-lg overflow-hidden">
        <button type="button" onClick={() => toggleSection('influence')} className="w-full p-4 flex items-center justify-between hover:bg-white/5">
          <h2 className="text-base font-semibold text-text-primary">영향력 평가</h2>
          <div className="flex items-center gap-3">
            <span className={`px-2 py-0.5 rounded text-xs font-bold ${RANK_COLORS[influence.rank]}`}>{influence.rank}등급 ({influence.totalScore}/100)</span>
            {openSections.influence ? <ChevronUp className="w-5 h-5 text-text-secondary" /> : <ChevronDown className="w-5 h-5 text-text-secondary" />}
          </div>
        </button>
        {openSections.influence && (
          <div className="px-4 pb-4 space-y-1.5">
            <div className="space-y-1.5">
              {Object.entries(INFLUENCE_LABELS).map(([key, { label, max }]) => {
                const field = influence[key as keyof typeof influence]
                if (typeof field === 'object' && 'score' in field) {
                  return (
                    <div key={key} className="flex items-center gap-2">
                      <label className="w-16 text-xs text-text-secondary shrink-0">{label}</label>
                      <input type="number" min={0} max={max} value={field.score} onChange={(e) => handleInfluenceChange(key, 'score', Math.min(max, Math.max(0, parseInt(e.target.value) || 0)))} className="w-12 px-2 py-1 bg-bg-secondary border border-border rounded text-text-primary text-center text-xs focus:border-accent focus:outline-none" />
                      <span className="text-xs text-text-secondary w-7">/{max}</span>
                      <div className="w-20 h-1.5 bg-bg-secondary rounded-full overflow-hidden shrink-0"><div className="h-full bg-accent rounded-full" style={{ width: `${(field.score / max) * 100}%` }} /></div>
                      <input type="text" value={field.exp} onChange={(e) => handleInfluenceChange(key, 'exp', e.target.value)} placeholder="설명" className="flex-1 px-2 py-1 text-xs bg-bg-secondary border border-border rounded text-text-primary placeholder-text-secondary focus:border-accent focus:outline-none" />
                    </div>
                  )
                }
                return null
              })}
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setInfluence(getEmptyInfluence())}
                className="text-xs text-text-secondary hover:text-text-primary"
              >
                초기화
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Cultural Journey */}
      <div className="bg-bg-card border border-border rounded-lg overflow-hidden">
        <button type="button" onClick={() => toggleSection('philosophy')} className="w-full p-4 flex items-center justify-between hover:bg-white/5">
          <h2 className="text-base font-semibold text-text-primary">감상 편력</h2>
          <div className="flex items-center gap-3">
            {!openSections.philosophy && formData.cultural_journey && (
              <span className="text-xs text-text-secondary">{formData.cultural_journey.length}자</span>
            )}
            {openSections.philosophy ? <ChevronUp className="w-5 h-5 text-text-secondary" /> : <ChevronDown className="w-5 h-5 text-text-secondary" />}
          </div>
        </button>
        {openSections.philosophy && (
        <div className="px-4 pb-4 space-y-3">
          {langMode === 'both' ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-xs text-text-secondary">국문</p>
                <textarea ref={philosophyTextareaRef} value={formData.cultural_journey} onChange={(e) => handleChange('cultural_journey', e.target.value)} placeholder="감상 편력 (3~4문단)" rows={6} className="w-full px-3 py-2 text-sm bg-bg-secondary border border-border rounded-lg text-text-primary placeholder-text-secondary focus:border-accent focus:outline-none resize-none overflow-hidden" />
                {formData.cultural_journey && (
                  <div className="p-3 bg-bg-secondary/50 border border-border rounded-lg text-sm text-text-primary leading-relaxed space-y-2">
                    {formData.cultural_journey.split('\n\n').map((p, i) => <p key={i}><FormattedText text={p} /></p>)}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <p className="text-xs text-blue-400/70">EN</p>
                <textarea value={formData.cultural_journey_en} onChange={(e) => handleChange('cultural_journey_en', e.target.value)} placeholder="EN: English philosophy (3-4 paragraphs)" rows={6} className="w-full px-3 py-2 text-xs bg-bg-secondary border border-border/60 rounded-lg text-text-primary placeholder-blue-400/50 focus:border-blue-400/50 focus:outline-none resize-none" />
                {formData.cultural_journey_en && (
                  <div className="p-3 bg-bg-secondary/30 border border-border/60 rounded-lg text-xs text-gray-400 leading-relaxed space-y-2">
                    {formData.cultural_journey_en.split('\n\n').map((p, i) => <p key={i}>{p}</p>)}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {langMode === 'ko' ? (
                <>
                  <textarea ref={philosophyTextareaRef} value={formData.cultural_journey} onChange={(e) => handleChange('cultural_journey', e.target.value)} placeholder="감상 편력 (3~4문단)" rows={6} className="w-full px-3 py-2 text-sm bg-bg-secondary border border-border rounded-lg text-text-primary placeholder-text-secondary focus:border-accent focus:outline-none resize-none overflow-hidden" />
                  {formData.cultural_journey && (
                    <div className="p-3 bg-bg-secondary/50 border border-border rounded-lg text-sm text-text-primary leading-relaxed space-y-2">
                      {formData.cultural_journey.split('\n\n').map((p, i) => <p key={i}><FormattedText text={p} /></p>)}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <textarea value={formData.cultural_journey_en} onChange={(e) => handleChange('cultural_journey_en', e.target.value)} placeholder="EN: English philosophy (3-4 paragraphs)" rows={6} className="w-full px-3 py-2 text-sm bg-bg-secondary border border-border/60 rounded-lg text-text-primary placeholder-blue-400/50 focus:border-blue-400/50 focus:outline-none resize-none" />
                  {formData.cultural_journey_en && (
                    <div className="p-3 bg-bg-secondary/30 border border-border/60 rounded-lg text-xs text-gray-400 leading-relaxed space-y-2">
                      {formData.cultural_journey_en.split('\n\n').map((p, i) => <p key={i}>{p}</p>)}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
        )}
      </div>

      {/* Tags */}
      <div className="bg-bg-card border border-border rounded-lg overflow-hidden">
        <button type="button" onClick={() => toggleSection('tags')} className="w-full p-4 flex items-center justify-between hover:bg-white/5">
          <h2 className="text-base font-semibold text-text-primary">태그</h2>
          <div className="flex items-center gap-3">
            {!openSections.tags && selectedTags.length > 0 && (
              <span className="text-xs text-text-secondary">{selectedTags.length}개</span>
            )}
            {openSections.tags ? <ChevronUp className="w-5 h-5 text-text-secondary" /> : <ChevronDown className="w-5 h-5 text-text-secondary" />}
          </div>
        </button>
        {openSections.tags && (
          <div className="px-4 pb-4">
            <p className="text-xs text-text-secondary mb-3">
              셀럽에게 태그를 부여하면 탐색 페이지에서 필터링할 수 있다.
            </p>
            <CelebTagSelector
              selectedTags={selectedTags}
              onTagsChange={setSelectedTags}
            />
          </div>
        )}
      </div>

    </form>

    {/* Floating Actions */}
    <div className="fixed bottom-6 right-6 flex items-center gap-3 z-50">
      {mode === 'edit' && (
        <Button type="button" variant="danger" onClick={handleDelete} disabled={deleteLoading}>
          {deleteLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}삭제
        </Button>
      )}
      {mode === 'create' && (
        <Button type="button" variant="secondary" onClick={() => router.push('/members?tab=celeb')}>취소</Button>
      )}
      <Button type="submit" form="celeb-form" disabled={loading}>
        {loading ? <><Loader2 className="w-4 h-4 animate-spin" />{mode === 'create' ? '생성 중...' : '저장 중...'}</> : mode === 'create' ? '생성' : '저장'}
      </Button>
    </div>

    {/* 이미지 크롭 모달 */}
    {cropModalOpen && cropImageSrc && (
      <ImageCropModal
        imageSrc={cropImageSrc}
        aspectRatio={1}
        onComplete={handleCropComplete}
        onCancel={handleCropCancel}
      />
    )}
    </>
  )
}
