'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createCeleb, updateCeleb, deleteCeleb } from '@/actions/admin/celebs'
import { uploadCelebImage } from '@/actions/admin/storage'
import { getCelebTags, updateCelebTags, type CelebTagInput } from '@/actions/admin/tags'
import { calculateInfluenceRank, type GeneratedInfluence } from '@feelandnote/ai-services/celeb-profile'
import type { Member } from '@/actions/admin/members'
import { CELEB_PROFESSIONS } from '@/constants/celebCategories'
import { useCountries } from '@/hooks/useCountries'
import { Loader2, Trash2, Star, X, Upload, ArrowLeft, FileJson, BookOpen, ChevronDown, ChevronUp } from 'lucide-react'
import Button from '@/components/ui/Button'
import AIBasicProfileSection from './AIBasicProfileSection'
import AIInfluenceSection from './AIInfluenceSection'
import { useToast } from '@/contexts/ToastContext'
import { resizeSingleImage, createPreviewUrl, type ImageType } from '@/lib/image'
import type { InfluenceScore } from '@feelandnote/ai-services/celeb-profile'
import ImageCropModal from '@/components/ui/ImageCropModal'
import BasicProfileJSONModal, { type BasicProfileJSONData } from './BasicProfileJSONModal'
import InfluenceJSONModal, { type InfluenceJSONData } from './InfluenceJSONModal'
import BasicProfilePromptModal from './BasicProfilePromptModal'
import InfluencePromptModal from './InfluencePromptModal'
import PhilosophyPromptModal from './PhilosophyPromptModal'
import CelebTagSelector from './CelebTagSelector'

// #region Types
interface CelebFormData {
  nickname: string
  profession: string
  title: string
  nationality: string
  birth_date: string
  death_date: string
  bio: string
  quotes: string
  avatar_url: string
  portrait_url: string
  is_verified: boolean
  status: 'active' | 'suspended'
  consumption_philosophy: string
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
    title: celeb?.title || '',
    nationality: celeb?.nationality || '',
    birth_date: celeb?.birth_date || '',
    death_date: celeb?.death_date || '',
    bio: celeb?.bio || '',
    quotes: celeb?.quotes || '',
    avatar_url: celeb?.avatar_url || '',
    portrait_url: celeb?.portrait_url || '',
    is_verified: celeb?.is_verified || false,
    status: (celeb?.status as 'active' | 'suspended') || 'active',
    consumption_philosophy: celeb?.consumption_philosophy || '',
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
  const { countries, loading: countriesLoading } = useCountries()
  const [formData, setFormData] = useState<CelebFormData>(getInitialFormData(celeb))
  const [influence, setInfluence] = useState<GeneratedInfluence>(getInitialInfluence(celeb))
  const [guessedName, setGuessedName] = useState(celeb?.nickname || '')
  const [loading, setLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  // JSON 입력 모달 상태
  const [basicProfileJSONModalOpen, setBasicProfileJSONModalOpen] = useState(false)
  const [influenceJSONModalOpen, setInfluenceJSONModalOpen] = useState(false)

  // 프로젝트 룰 모달 상태
  const [basicProfilePromptModalOpen, setBasicProfilePromptModalOpen] = useState(false)
  const [influencePromptModalOpen, setInfluencePromptModalOpen] = useState(false)
  const [philosophyPromptModalOpen, setPhilosophyPromptModalOpen] = useState(false)

  // AI 생성 섹션 접힘 상태 (기본: 접힘)
  const [aiSectionExpanded, setAiSectionExpanded] = useState(false)

  // 활성 섹션 상태 (Ctrl+V 대상)
  const [activeSection, setActiveSection] = useState<'basicInfo' | 'influence' | 'philosophy' | null>(null)

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
    const hasNewImages = avatarFile !== null || portraitFile !== null
    const tagsChanged = JSON.stringify(selectedTags) !== JSON.stringify(initialTags.current)
    return formChanged || influenceChanged || hasNewImages || tagsChanged
  }, [formData, influence, avatarFile, portraitFile, isSaved, selectedTags])

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

  // Ctrl+V 이벤트 - 활성 섹션에 클립보드 데이터 입력 (입력 필드 밖에서만 작동)
  useEffect(() => {
    function handlePaste(e: ClipboardEvent) {
      if (!activeSection) return

      // 입력 필드(input, textarea, select)에 포커스가 있으면 일반 붙여넣기 허용
      const target = e.target as HTMLElement
      const isInputField = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT'
      if (isInputField) return

      const text = e.clipboardData?.getData('text')
      if (!text) return

      e.preventDefault()

      try {
        if (activeSection === 'philosophy') {
          // 일반 텍스트 그대로 입력 (JSON 파싱 불필요)
          setFormData((prev) => ({ ...prev, consumption_philosophy: text }))
          showToast('success', '감상 철학이 입력되었습니다.')
        } else if (activeSection === 'basicInfo') {
          // JSON 파싱 시도
          const parsed = JSON.parse(text) as Partial<BasicProfileJSONData>
          setFormData((prev) => ({
            ...prev,
            ...(parsed.nickname && { nickname: parsed.nickname }),
            ...(parsed.profession && { profession: parsed.profession }),
            ...(parsed.title && { title: parsed.title }),
            ...(parsed.nationality && { nationality: parsed.nationality }),
            ...(parsed.birth_date && { birth_date: parsed.birth_date }),
            ...(parsed.death_date && { death_date: parsed.death_date }),
            ...(parsed.bio && { bio: parsed.bio }),
            ...(parsed.quotes && { quotes: parsed.quotes }),
            ...(parsed.avatar_url && { avatar_url: parsed.avatar_url }),
            ...(parsed.portrait_url && { portrait_url: parsed.portrait_url }),
            ...(parsed.is_verified !== undefined && { is_verified: parsed.is_verified }),
          }))
          showToast('success', '기본 정보가 입력되었습니다.')
        } else if (activeSection === 'influence') {
          // JSON 파싱 시도
          const parsed = JSON.parse(text) as Partial<InfluenceJSONData>
          const updated: GeneratedInfluence = {
            political: parsed.political || influence.political,
            strategic: parsed.strategic || influence.strategic,
            tech: parsed.tech || influence.tech,
            social: parsed.social || influence.social,
            economic: parsed.economic || influence.economic,
            cultural: parsed.cultural || influence.cultural,
            transhistoricity: parsed.transhistoricity || influence.transhistoricity,
            totalScore: 0,
            rank: 'D',
          }
          const totalScore =
            updated.political.score +
            updated.strategic.score +
            updated.tech.score +
            updated.social.score +
            updated.economic.score +
            updated.cultural.score +
            updated.transhistoricity.score
          setInfluence({ ...updated, totalScore, rank: calculateInfluenceRank(totalScore) })
          showToast('success', '영향력 정보가 입력되었습니다.')
        }
      } catch (err) {
        showToast('error', 'JSON 형식이 올바르지 않습니다.')
      }
    }

    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
  }, [activeSection, influence, showToast])

  // 뒤로가기 클릭 핸들러
  function handleBackClick(e: React.MouseEvent<HTMLAnchorElement>) {
    if (isDirty()) {
      e.preventDefault()
      if (confirm('저장하지 않은 변경 사항이 있습니다. 정말 나가시겠습니까?')) {
        router.push('/members?tab=celeb')
      }
    }
  }

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

  function handleBasicProfileJSONApply(data: BasicProfileJSONData) {
    setFormData((prev) => ({
      ...prev,
      nickname: data.nickname || prev.nickname,
      profession: data.profession || prev.profession,
      title: data.title || prev.title,
      nationality: data.nationality || prev.nationality,
      birth_date: data.birth_date || prev.birth_date,
      death_date: data.death_date || prev.death_date,
      bio: data.bio || prev.bio,
      quotes: data.quotes || prev.quotes,
      avatar_url: data.avatar_url || prev.avatar_url,
      portrait_url: data.portrait_url || prev.portrait_url,
      is_verified: data.is_verified ?? prev.is_verified,
    }))
    showToast('success', '기본 정보가 적용되었습니다.')
  }

  function handleInfluenceJSONApply(data: InfluenceJSONData) {
    setInfluence(() => {
      const updated: GeneratedInfluence = {
        political: data.political || { score: 0, exp: '' },
        strategic: data.strategic || { score: 0, exp: '' },
        tech: data.tech || { score: 0, exp: '' },
        social: data.social || { score: 0, exp: '' },
        economic: data.economic || { score: 0, exp: '' },
        cultural: data.cultural || { score: 0, exp: '' },
        transhistoricity: data.transhistoricity || { score: 0, exp: '' },
        totalScore: 0,
        rank: 'D',
      }
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
    showToast('success', '영향력 정보가 적용되었습니다.')
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
          title: formData.title || undefined,
          nationality: formData.nationality || undefined,
          birth_date: formData.birth_date || undefined,
          death_date: formData.death_date || undefined,
          bio: formData.bio || undefined,
          quotes: formData.quotes || undefined,
          avatar_url: avatarUrl,
          portrait_url: portraitUrl,
          is_verified: formData.is_verified,
          consumption_philosophy: formData.consumption_philosophy || undefined,
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
          title: formData.title || undefined,
          nationality: formData.nationality || undefined,
          birth_date: formData.birth_date || undefined,
          death_date: formData.death_date || undefined,
          bio: formData.bio || undefined,
          quotes: formData.quotes || undefined,
          avatar_url: avatarUrl,
          portrait_url: portraitUrl,
          is_verified: formData.is_verified,
          status: formData.status,
          consumption_philosophy: formData.consumption_philosophy || undefined,
          influence: hasInfluence ? influence : undefined,
        })

        // 태그 저장
        await updateCelebTags(celeb.id, selectedTags)

        // 저장 후 초기값 업데이트 (isDirty 리셋)
        const updatedFormData = { ...formData, avatar_url: avatarUrl || '', portrait_url: portraitUrl || '' }
        initialFormData.current = updatedFormData
        initialInfluence.current = influence
        initialTags.current = selectedTags
        setFormData(updatedFormData)
        setAvatarFile(null)
        setPortraitFile(null)

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
    {/* 셀럽 페이지 헤더 (edit 모드) */}
    {mode === 'edit' && celeb && (
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/members?tab=celeb"
          onClick={handleBackClick}
          className="p-2 hover:bg-bg-card rounded-lg"
        >
          <ArrowLeft className="w-5 h-5 text-text-secondary" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">셀럽 상세</h1>
          <p className="text-text-secondary mt-1">{celeb.nickname}</p>
        </div>
      </div>
    )}

    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">{error}</div>}

      {/* AI 생성 섹션 (접기 가능) */}
      <div className="bg-bg-card border border-border rounded-lg overflow-hidden">
        <button
          type="button"
          onClick={() => setAiSectionExpanded(!aiSectionExpanded)}
          className="w-full p-4 flex items-center justify-between hover:bg-white/5"
        >
          <h2 className="text-base font-semibold text-text-primary">AI 생성 및 JSON 입력</h2>
          {aiSectionExpanded ? (
            <ChevronUp className="w-5 h-5 text-text-secondary" />
          ) : (
            <ChevronDown className="w-5 h-5 text-text-secondary" />
          )}
        </button>

        {aiSectionExpanded && (
          <div className="px-4 pb-4 space-y-3">
            {/* 추정 닉네임 입력 (AI 검색용) */}
            <div className="bg-accent/5 border border-accent/20 rounded-lg p-3 space-y-2">
              <label htmlFor="guessed-name" className="block text-xs font-medium text-text-primary">
                추정 닉네임 <span className="text-xs text-text-secondary font-normal">(AI 검색 및 json 입출력용)</span>
              </label>
              <input
                type="text"
                id="guessed-name"
                value={guessedName}
                onChange={(e) => setGuessedName(e.target.value)}
                placeholder="예: Elon Musk, 일론 머스크, 테슬라 CEO..."
                className="w-full px-3 py-1.5 text-sm bg-bg-secondary border border-border rounded-lg text-text-primary placeholder-text-secondary focus:border-accent focus:outline-none"
              />
            </div>

            {/* 2열 레이아웃 */}
            <div className="grid grid-cols-2 gap-3">
              <AIBasicProfileSection guessedName={guessedName} onApply={applyBasicProfile} />
              <AIInfluenceSection guessedName={guessedName} onApply={applyInfluence} />
            </div>
          </div>
        )}
      </div>

      {/* Basic Info */}
      <div className={`bg-bg-card border-2 rounded-lg overflow-hidden transition-all ${activeSection === 'basicInfo' ? 'border-accent shadow-lg shadow-accent/20' : 'border-border'}`}>
        <div
          onClick={() => setActiveSection(activeSection === 'basicInfo' ? null : 'basicInfo')}
          className={`p-4 cursor-pointer transition-colors ${activeSection === 'basicInfo' ? 'bg-accent/5' : 'hover:bg-white/5'}`}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-text-primary">기본정보</h2>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  setBasicProfilePromptModalOpen(true)
                }}
              >
                <BookOpen className="w-4 h-4" />
                프로젝트 룰
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  setBasicProfileJSONModalOpen(true)
                }}
              >
                <FileJson className="w-4 h-4" />
                JSON 입력
              </Button>
            </div>
          </div>
        </div>
        <div className="px-4 pb-4 space-y-3">
        <div className="grid grid-cols-[1fr_280px] gap-4">
          {/* 좌측: 기본 텍스트 정보 */}
          <div className="space-y-2">
            {/* 인라인 입력 필드 그리드 */}
            <div className="grid grid-cols-[80px_1fr] gap-x-3 gap-y-2 items-center text-sm">
          <label htmlFor="nickname" className="text-xs font-medium text-text-secondary">닉네임 <span className="text-red-400">*</span></label>
          <input type="text" id="nickname" required value={formData.nickname} onChange={(e) => handleChange('nickname', e.target.value)} placeholder="셀럽 닉네임" className="px-3 py-1.5 text-sm bg-bg-secondary border border-border rounded-lg text-text-primary placeholder-text-secondary focus:border-accent focus:outline-none" />

          <label htmlFor="profession" className="text-xs font-medium text-text-secondary">직군</label>
          <select id="profession" value={formData.profession} onChange={(e) => handleChange('profession', e.target.value)} className="px-3 py-1.5 text-sm bg-bg-secondary border border-border rounded-lg text-text-primary focus:border-accent focus:outline-none">
            <option value="">직군 선택</option>
            {CELEB_PROFESSIONS.map((prof) => <option key={prof.value} value={prof.value}>{prof.label}</option>)}
          </select>

          <label htmlFor="title" className="text-xs font-medium text-text-secondary">수식어</label>
          <input type="text" id="title" value={formData.title} onChange={(e) => handleChange('title', e.target.value)} placeholder="예: 테슬라 창립자, 철의 여인" className="px-3 py-1.5 text-sm bg-bg-secondary border border-border rounded-lg text-text-primary placeholder-text-secondary focus:border-accent focus:outline-none" />

          <label htmlFor="nationality" className="text-xs font-medium text-text-secondary">국적</label>
          <select id="nationality" value={formData.nationality} onChange={(e) => handleChange('nationality', e.target.value)} disabled={countriesLoading} className="px-3 py-1.5 text-sm bg-bg-secondary border border-border rounded-lg text-text-primary focus:border-accent focus:outline-none disabled:opacity-50">
            <option value="">{countriesLoading ? '로딩 중...' : '국적 선택'}</option>
            {countries.map((country) => <option key={country.code} value={country.code}>{country.name}</option>)}
          </select>

          <label htmlFor="birth_date" className="text-xs font-medium text-text-secondary">출생</label>
          <div className="grid grid-cols-2 gap-2">
            <input type="text" id="birth_date" value={formData.birth_date} onChange={(e) => handleChange('birth_date', e.target.value)} placeholder="1955-02-24 또는 -356" className="px-3 py-1.5 text-sm bg-bg-secondary border border-border rounded-lg text-text-primary placeholder-text-secondary focus:border-accent focus:outline-none" />
            <input type="text" id="death_date" value={formData.death_date} onChange={(e) => handleChange('death_date', e.target.value)} placeholder="사망일 (생존시 공백)" className="px-3 py-1.5 text-sm bg-bg-secondary border border-border rounded-lg text-text-primary placeholder-text-secondary focus:border-accent focus:outline-none" />
          </div>

          <label htmlFor="bio" className="text-xs font-medium text-text-secondary self-start pt-1">소개</label>
          <textarea id="bio" rows={2} value={formData.bio} onChange={(e) => handleChange('bio', e.target.value)} placeholder="셀럽 소개글" className="px-3 py-1.5 text-sm bg-bg-secondary border border-border rounded-lg text-text-primary placeholder-text-secondary focus:border-accent focus:outline-none resize-none" />

          <label htmlFor="quotes" className="text-xs font-medium text-text-secondary self-start pt-1">명언</label>
          <textarea id="quotes" rows={2} value={formData.quotes} onChange={(e) => handleChange('quotes', e.target.value)} placeholder="대표 명언 또는 발언" className="px-3 py-1.5 text-sm bg-bg-secondary border border-border rounded-lg text-text-primary placeholder-text-secondary focus:border-accent focus:outline-none resize-none" />
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={formData.is_verified} onChange={(e) => handleChange('is_verified', e.target.checked)} className="w-4 h-4 rounded border-border bg-bg-secondary text-accent focus:ring-accent" />
              <div className="flex items-center gap-1.5"><Star className="w-3.5 h-3.5 text-blue-400" /><span className="text-xs text-text-primary">공식 인증 계정</span></div>
            </label>

            {mode === 'edit' && (
              <div className="flex items-center gap-3">
                <label className="text-xs font-medium text-text-secondary">상태</label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="radio" name="status" value="active" checked={formData.status === 'active'} onChange={() => handleChange('status', 'active')} className="w-3.5 h-3.5" />
                    <span className="text-xs text-text-primary">활성</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="radio" name="status" value="suspended" checked={formData.status === 'suspended'} onChange={() => handleChange('status', 'suspended')} className="w-3.5 h-3.5" />
                    <span className="text-xs text-text-primary">비활성</span>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* 우측: 프로필 이미지 */}
          <div className="space-y-3">
            {/* 썸네일 (3:4) */}
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-text-secondary">썸네일 <span className="text-xs font-normal">(300×400)</span></p>
              <div
                onDragOver={(e) => handleDragOver(e, 'avatar')}
                onDragLeave={(e) => handleDragLeave(e, 'avatar')}
                onDrop={(e) => handleDrop(e, 'avatar')}
                onClick={() => avatarInputRef.current?.click()}
                className={`relative flex flex-col items-center justify-center gap-2 p-4 border-2 border-dashed rounded-xl cursor-pointer hover:border-accent/50 hover:bg-accent/5 ${avatarDragging ? 'border-accent bg-accent/10' : 'border-border'}`}
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
                    <div className="w-12 h-12 rounded-full bg-bg-secondary flex items-center justify-center">
                      <Upload className="w-5 h-5 text-text-secondary" />
                    </div>
                    <span className="text-xs text-text-secondary">클릭 또는 드래그</span>
                  </>
                )}
              </div>
              <input
                type="url"
                value={formData.avatar_url}
                onChange={(e) => handleChange('avatar_url', e.target.value)}
                placeholder="또는 이미지 URL 입력"
                className="w-full px-2 py-1.5 text-xs bg-bg-secondary border border-border rounded-lg text-text-primary placeholder-text-secondary focus:border-accent focus:outline-none"
              />
            </div>

            {/* 초상화 (9:16) */}
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-text-secondary">초상화 <span className="text-xs font-normal">(675×1200)</span></p>
              <div
                onDragOver={(e) => handleDragOver(e, 'portrait')}
                onDragLeave={(e) => handleDragLeave(e, 'portrait')}
                onDrop={(e) => handleDrop(e, 'portrait')}
                onClick={() => portraitInputRef.current?.click()}
                className={`relative flex flex-col items-center justify-center gap-2 p-4 border-2 border-dashed rounded-xl cursor-pointer hover:border-accent/50 hover:bg-accent/5 ${portraitDragging ? 'border-accent bg-accent/10' : 'border-border'}`}
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
                    <div className="w-12 h-12 rounded-full bg-bg-secondary flex items-center justify-center">
                      <Upload className="w-5 h-5 text-text-secondary" />
                    </div>
                    <span className="text-xs text-text-secondary">클릭 또는 드래그</span>
                  </>
                )}
              </div>
              <input
                type="url"
                value={formData.portrait_url}
                onChange={(e) => handleChange('portrait_url', e.target.value)}
                placeholder="또는 이미지 URL 입력"
                className="w-full px-2 py-1.5 text-xs bg-bg-secondary border border-border rounded-lg text-text-primary placeholder-text-secondary focus:border-accent focus:outline-none"
              />
            </div>
          </div>
        </div>
        </div>
      </div>

      {/* Influence Card */}
      <div className={`bg-bg-card border-2 rounded-lg overflow-hidden transition-all ${activeSection === 'influence' ? 'border-accent shadow-lg shadow-accent/20' : 'border-border'}`}>
        <div
          onClick={() => setActiveSection(activeSection === 'influence' ? null : 'influence')}
          className={`p-4 cursor-pointer transition-colors ${activeSection === 'influence' ? 'bg-accent/5' : 'hover:bg-white/5'}`}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-text-primary">영향력 평가</h2>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  setInfluencePromptModalOpen(true)
                }}
              >
                <BookOpen className="w-4 h-4" />
                프로젝트 룰
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  setInfluenceJSONModalOpen(true)
                }}
              >
                <FileJson className="w-4 h-4" />
                JSON 입력
              </Button>
              <span className={`px-2 py-0.5 rounded text-xs font-bold ${RANK_COLORS[influence.rank]}`}>{influence.rank}등급 ({influence.totalScore}/100)</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setInfluence(getEmptyInfluence())
                }}
                className="p-1 text-text-secondary hover:text-text-primary"
                title="영향력 초기화"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
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
        </div>
      </div>

      {/* Consumption Philosophy */}
      <div className={`bg-bg-card border-2 rounded-lg overflow-hidden transition-all ${activeSection === 'philosophy' ? 'border-accent shadow-lg shadow-accent/20' : 'border-border'}`}>
        <div
          onClick={() => setActiveSection(activeSection === 'philosophy' ? null : 'philosophy')}
          className={`p-4 cursor-pointer transition-colors ${activeSection === 'philosophy' ? 'bg-accent/5' : 'hover:bg-white/5'}`}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-text-primary">감상 철학</h2>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                setPhilosophyPromptModalOpen(true)
              }}
            >
              <BookOpen className="w-4 h-4" />
              프로젝트 룰
            </Button>
          </div>
        </div>
        <div className="px-4 pb-4 space-y-2">
        <div className="space-y-2">
          <p className="text-xs text-text-secondary">셀럽의 콘텐츠 감상 철학이나 취향을 3~4문단으로 작성해주세요.</p>
          <textarea
            value={formData.consumption_philosophy}
            onChange={(e) => handleChange('consumption_philosophy', e.target.value)}
            placeholder="예: 콘텐츠를 선택할 때 가장 중요하게 생각하는 기준은..."
            rows={8}
            className="w-full px-3 py-2 text-sm bg-bg-secondary border border-border rounded-lg text-text-primary placeholder-text-secondary focus:border-accent focus:outline-none resize-none"
          />
        </div>
        </div>
      </div>

      {/* Tags */}
      <div className="bg-bg-card border border-border rounded-lg p-4">
        <h2 className="text-base font-semibold text-text-primary mb-3">태그</h2>
        <p className="text-xs text-text-secondary mb-3">
          셀럽에게 태그를 부여하면 탐색 페이지에서 필터링할 수 있다.
        </p>
        <CelebTagSelector
          selectedTags={selectedTags}
          onTagsChange={setSelectedTags}
        />
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

    {/* JSON 입력 모달 */}
    <BasicProfileJSONModal
      isOpen={basicProfileJSONModalOpen}
      onClose={() => setBasicProfileJSONModalOpen(false)}
      onApply={handleBasicProfileJSONApply}
      guessedName={guessedName}
    />
    <InfluenceJSONModal
      isOpen={influenceJSONModalOpen}
      onClose={() => setInfluenceJSONModalOpen(false)}
      onApply={handleInfluenceJSONApply}
      guessedName={guessedName}
    />

    {/* 프로젝트 룰 모달 */}
    <BasicProfilePromptModal
      isOpen={basicProfilePromptModalOpen}
      onClose={() => setBasicProfilePromptModalOpen(false)}
      guessedName={guessedName}
    />
    <InfluencePromptModal
      isOpen={influencePromptModalOpen}
      onClose={() => setInfluencePromptModalOpen(false)}
      guessedName={guessedName}
    />
    <PhilosophyPromptModal
      isOpen={philosophyPromptModalOpen}
      onClose={() => setPhilosophyPromptModalOpen(false)}
      guessedName={guessedName}
    />
    </>
  )
}
