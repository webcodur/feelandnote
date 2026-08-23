'use client'

import { useState, useRef, useEffect, useCallback, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { createCeleb, updateCeleb, deleteCeleb, setCelebMonologueLock } from '@/actions/admin/celebs'
import { uploadCelebImage } from '@/actions/admin/storage'
import { calculateInfluenceRank, type GeneratedInfluence } from '@feelandnote/ai-services/celeb-profile'
import { CELEB_HERO_PHOTO_SPEC } from '@feelandnote/shared/constants/celeb-hero-photo'
import type { Member } from '@/actions/admin/members'
import { CELEB_PROFESSIONS } from '@/constants/celebCategories'
import { useCountries } from '@/hooks/useCountries'
import { Loader2, Trash2, Star, ChevronDown, ChevronUp, Lock, LockOpen } from 'lucide-react'
import Button from '@/components/ui/Button'
import { useToast } from '@/contexts/ToastContext'
import { resizeSingleImage, resizePortraitImage } from '@/lib/image'
import CelebAvatarEditor, { AvatarUploadEmpty } from '@/components/celeb/avatar/CelebAvatarEditor'
import CelebAvatarNobgButton from '@/components/celeb/avatar/CelebAvatarNobgButton'
import { saveCelebAvatar } from '@/components/celeb/avatar/saveCelebAvatar'
import CelebPortraitEditor from '@/components/celeb/portrait/CelebPortraitEditor'
import { saveCelebPortrait } from '@/components/celeb/portrait/saveCelebPortrait'
import FormattedText from '@/components/ui/FormattedText'
import { useLangMode, type LangMode } from '@/contexts/LangModeContext'
import { persistCroppedCelebImage } from './persistCroppedCelebImage'
import CelebDetailHeader from '../../celebs/[slug]/CelebDetailHeader'

// #region Types
interface CelebFormData {
  nickname: string
  nickname_en: string
  profession: string
  title: string
  title_en: string
  headline: string
  headline_en: string
  nationality: string
  gender: boolean | null
  birth_date: string
  death_date: string
  bio: string
  bio_en: string
  avatar_url: string
  portrait_url: string
  is_verified: boolean
  status: 'active' | 'inactive'
  celeb_tier: 'full' | 'light' | 'fiction'
  cultural_journey: string
  cultural_journey_en: string
}

interface Props {
  mode: 'create' | 'edit'
  celeb?: Member
  children?: ReactNode
  lead?: ReactNode
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
    headline: celeb?.headline || '',
    headline_en: celeb?.headline_en || '',
    nationality: celeb?.nationality || '',
    gender: celeb?.gender ?? null,
    birth_date: celeb?.birth_date || '',
    death_date: celeb?.death_date || '',
    bio: celeb?.bio || '',
    bio_en: celeb?.bio_en || '',
    avatar_url: celeb?.avatar_url || '',
    portrait_url: celeb?.portrait_url || '',
    is_verified: celeb?.is_verified || false,
    status: (celeb?.status as 'active' | 'inactive') || 'inactive',
    // 새로 만드는 인물은 감상 기록이 있을 수 없어 full로 저장되지 않는다(DB가 막는다)
    celeb_tier: celeb ? ((celeb.celeb_tier as 'full' | 'light' | 'fiction') || 'full') : 'light',
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

/**
 * 취소·삭제 후 돌아갈 목록.
 *
 * 이 폼은 파일 위치만 members/ 아래일 뿐 celebs/new·celebs/[slug] 두 곳에서만
 * 쓴다(users/ 쪽 사용처 없음). 따라서 복귀 목록은 셀럽 목록 하나로 확정된다.
 * 예전 값 '/members?tab=celeb'은 /members 스텁이 쿼리를 버리고 /users로
 * 넘기는 탓에 셀럽을 편집하다 취소하면 유저 목록에 떨어졌다.
 */
const CELEB_LIST_PATH = '/celebs'

export default function CelebForm({ mode, celeb, children, lead }: Props) {
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

  // 대표 화보(celebs.portrait_url) — 업로드 직후 공용 상수 비율로 위치·확대 편집을 거친다
  const [portraitFile, setPortraitFile] = useState<File | null>(null)
  const [portraitPreview, setPortraitPreview] = useState<string | null>(null)

  // 감상 여정 textarea ref (자동 높이 조절용)
  const journeyTextareaRef = useRef<HTMLTextAreaElement>(null)

  // 섹션 접힘 상태
  const [openSections, setOpenSections] = useState({
    basicInfo: true,
    influence: false,
    journey: false,
    monologue: false,
  })

  function toggleSection(key: keyof typeof openSections) {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }))
  }

  // 가상 독백 확정 잠금 — 잠기면 DB 트리거가 모든 경로의 독백 수정을 차단한다
  const [monologueLockedAt, setMonologueLockedAt] = useState<string | null>(celeb?.virtual_monologue_locked_at ?? null)
  const [monologueLockLoading, setMonologueLockLoading] = useState(false)

  async function toggleMonologueLock() {
    if (!celeb) return
    setMonologueLockLoading(true)
    try {
      const { locked_at } = await setCelebMonologueLock(celeb.id, !monologueLockedAt)
      setMonologueLockedAt(locked_at)
      showToast('success', locked_at ? '가상 독백을 확정했습니다. 잠금 해제 전까지 수정되지 않습니다.' : '잠금을 해제했습니다.')
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : '잠금 변경에 실패했습니다.')
    } finally {
      setMonologueLockLoading(false)
    }
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

  // isDirty 계산 - 폼 데이터가 변경되었는지 확인
  const isDirty = useCallback(() => {
    if (isSaved) return false
    const formChanged = JSON.stringify(formData) !== JSON.stringify(initialFormData.current)
    const influenceChanged = JSON.stringify(influence) !== JSON.stringify(initialInfluence.current)
    const hasNewImages = avatarFile !== null || portraitFile !== null
    return formChanged || influenceChanged || hasNewImages
  }, [formData, influence, avatarFile, portraitFile, isSaved])

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

  // 감상 여정 textarea 자동 높이 조절
  const adjustJourneyHeight = useCallback(() => {
    const textarea = journeyTextareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${textarea.scrollHeight}px`
    }
  }, [])

  useEffect(() => {
    adjustJourneyHeight()
  }, [formData.cultural_journey, adjustJourneyHeight])

  // 화면 리사이즈 시 높이 재조정
  useEffect(() => {
    window.addEventListener('resize', adjustJourneyHeight)
    return () => window.removeEventListener('resize', adjustJourneyHeight)
  }, [adjustJourneyHeight])

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

  async function persistPublicationStatus(next: 'active' | 'inactive') {
    const previous = formData.status
    handleChange('status', next)
    if (mode !== 'edit' || !celeb || previous === next) return
    try {
      await updateCeleb({ id: celeb.id, status: next })
      initialFormData.current = { ...initialFormData.current, status: next }
      showToast('success', next === 'active' ? '인물을 활성으로 바꿨다.' : '인물을 비공개로 바꿨다.')
      router.refresh()
    } catch (error) {
      handleChange('status', previous)
      showToast('error', error instanceof Error ? error.message : '인물 활성 상태를 바꾸지 못했다.')
    }
  }

  async function persistVerified(next: boolean) {
    const previous = formData.is_verified
    handleChange('is_verified', next)
    if (mode !== 'edit' || !celeb || previous === next) return
    try {
      await updateCeleb({ id: celeb.id, is_verified: next })
      initialFormData.current = { ...initialFormData.current, is_verified: next }
      showToast('success', next ? '인증 완료로 변경했습니다.' : '인증 해제했습니다.')
      router.refresh()
    } catch (error) {
      handleChange('is_verified', previous)
      showToast('error', error instanceof Error ? error.message : '인증 상태를 변경하지 못했습니다.')
    }
  }

  async function persistTier(next: 'full' | 'light' | 'fiction') {
    const previous = formData.celeb_tier
    handleChange('celeb_tier', next)
    if (mode !== 'edit' || !celeb || previous === next) return
    try {
      await updateCeleb({ id: celeb.id, celeb_tier: next })
      initialFormData.current = { ...initialFormData.current, celeb_tier: next }
      showToast('success', `인물 등급을 ${next}로 변경했습니다.`)
      router.refresh()
    } catch (error) {
      handleChange('celeb_tier', previous)
      showToast('error', error instanceof Error ? error.message : '인물 등급을 변경하지 못했습니다.')
    }
  }

  function handleImageRemove() {
    setAvatarFile(null)
    setAvatarPreview(null)
  }

  async function handleAvatarCrop(file: File, croppedDataUrl: string) {
    const url = await persistCroppedCelebImage({
      mode,
      celebId: celeb?.id,
      file,
      persist: saveCelebAvatar,
    })

    if (url) {
      setError(null)
      setAvatarFile(null)
      setAvatarPreview(null)
      initialFormData.current = { ...initialFormData.current, avatar_url: url }
      setFormData((prev) => ({ ...prev, avatar_url: url }))
      showToast('success', '아바타를 저장했습니다.')
      return
    }

    setAvatarFile(file)
    setAvatarPreview(croppedDataUrl)
  }

  function handleAvatarNobgCompleted(url: string) {
    setAvatarFile(null)
    setAvatarPreview(null)
    initialFormData.current = { ...initialFormData.current, avatar_url: url }
    setFormData((prev) => ({ ...prev, avatar_url: url }))
  }

  // #region 대표 화보
  async function handlePortraitCrop(file: File, croppedDataUrl: string) {
    const url = await persistCroppedCelebImage({
      mode,
      celebId: celeb?.id,
      file,
      persist: saveCelebPortrait,
    })

    if (url) {
      setError(null)
      setPortraitFile(null)
      setPortraitPreview(null)
      initialFormData.current = { ...initialFormData.current, portrait_url: url }
      setFormData((prev) => ({ ...prev, portrait_url: url }))
      showToast('success', '대표 사진을 저장했습니다.')
      return
    }

    setPortraitFile(file)
    setPortraitPreview(croppedDataUrl)
  }

  // 저장하면 DB에서도 비워진다(빈 문자열 → null)
  function handlePortraitRemove() {
    setPortraitFile(null)
    setPortraitPreview(null)
    setFormData((prev) => ({ ...prev, portrait_url: '' }))
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
    if (mode === 'create' && !formData.nickname_en.trim()) {
      setError('slug 생성을 위해 영문 이름을 입력해주세요.')
      setLoading(false)
      return
    }

    try {
      let avatarUrl = formData.avatar_url || undefined
      let portraitUrl = formData.portrait_url

      if (mode === 'create') {
        const hasInfluence = influence.totalScore > 0
        const result = await createCeleb({
          nickname: formData.nickname.trim(),
          nickname_en: formData.nickname_en || undefined,
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

        if (portraitFile) {
          const resized = await resizePortraitImage(portraitFile)
          const uploadResult = await uploadCelebImage({ celebId: result.id, image: resized, type: 'portrait' })
          if (!uploadResult.success) throw new Error(uploadResult.error || '대표 화보 업로드 실패')
          await updateCeleb({ id: result.id, portrait_url: uploadResult.url })
        } else if (portraitUrl) {
          await updateCeleb({ id: result.id, portrait_url: portraitUrl })
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
          const resized = await resizePortraitImage(portraitFile)
          const uploadResult = await uploadCelebImage({ celebId: celeb.id, image: resized, type: 'portrait' })
          if (uploadResult.success) portraitUrl = uploadResult.url || ''
          else throw new Error(uploadResult.error || '대표 화보 업로드 실패')
        }

        const hasInfluence = influence.totalScore > 0
        await updateCeleb({
          id: celeb.id,
          nickname: formData.nickname.trim(),
          nickname_en: formData.nickname_en,
          profession: formData.profession || undefined,
          title: formData.title || undefined,
          title_en: formData.title_en,
          headline: formData.headline || undefined,
          headline_en: formData.headline_en,
          nationality: formData.nationality || undefined,
          gender: formData.gender,
          birth_date: formData.birth_date || undefined,
          death_date: formData.death_date || undefined,
          bio: formData.bio || undefined,
          bio_en: formData.bio_en,
          avatar_url: avatarUrl,
          portrait_url: portraitUrl,
          is_verified: formData.is_verified,
          status: formData.status,
          celeb_tier: formData.celeb_tier,
          cultural_journey: formData.cultural_journey || undefined,
          cultural_journey_en: formData.cultural_journey_en,
          influence: hasInfluence ? influence : undefined,
        })

        // 저장 후 초기값 업데이트 (isDirty 리셋)
        const updatedFormData = { ...formData, avatar_url: avatarUrl || '', portrait_url: portraitUrl }
        initialFormData.current = updatedFormData
        initialInfluence.current = influence
        setFormData(updatedFormData)
        setAvatarFile(null)
        setPortraitFile(null)
        setPortraitPreview(null)

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
    if (!confirm('이 인물을 삭제 처리하시겠습니까? 인물 목록과 서비스에서 숨겨집니다.')) return

    setDeleteLoading(true)
    setError(null)

    try {
      await deleteCeleb(celeb.id)
      router.push(CELEB_LIST_PATH)
    } catch (err) {
      setError(err instanceof Error ? err.message : '삭제에 실패했습니다.')
      setDeleteLoading(false)
    }
  }

  const options = (
    <div className="flex items-center gap-4">
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={formData.is_verified} onChange={(e) => handleChange('is_verified', e.target.checked)} className="w-3.5 h-3.5 rounded border-border bg-bg-secondary text-accent focus:ring-accent" />
        <div className="flex items-center gap-1"><Star className="w-3 h-3 text-blue-400" /><span className="text-xs text-text-primary">인증</span></div>
      </label>
      <div className="flex items-center gap-2">
        <span className="text-xs text-text-secondary">인물 활성</span>
        <label className="flex items-center gap-1 cursor-pointer">
          <input type="radio" name="status" value="active" checked={formData.status === 'active'} onChange={() => { void persistPublicationStatus('active') }} className="w-3 h-3" />
          <span className="text-xs text-text-primary">활성</span>
        </label>
        <label className="flex items-center gap-1 cursor-pointer">
          <input type="radio" name="status" value="inactive" checked={formData.status === 'inactive'} onChange={() => { void persistPublicationStatus('inactive') }} className="w-3 h-3" />
          <span className="text-xs text-text-primary">비공개</span>
        </label>
      </div>
      <div className="flex items-center gap-2 border-l border-border pl-4">
        {mode === 'create' ? (
          <>
            <span className="text-xs font-mono text-orange-400">light</span>
            <span className="text-[10px] text-text-secondary">감상 기록을 채운 뒤 올린다</span>
          </>
        ) : (
          <>
            <label className="flex items-center gap-1 cursor-pointer">
              <input type="radio" name="celeb_tier" value="full" checked={formData.celeb_tier === 'full'} onChange={() => handleChange('celeb_tier', 'full')} className="w-3 h-3" />
              <span className="text-xs text-text-primary">full</span>
            </label>
            <label className="flex items-center gap-1 cursor-pointer">
              <input type="radio" name="celeb_tier" value="light" checked={formData.celeb_tier === 'light'} onChange={() => handleChange('celeb_tier', 'light')} className="w-3 h-3" />
              <span className="text-xs font-mono text-orange-400">light</span>
            </label>
            <label className="flex items-center gap-1 cursor-pointer">
              <input type="radio" name="celeb_tier" value="fiction" checked={formData.celeb_tier === 'fiction'} onChange={() => handleChange('celeb_tier', 'fiction')} className="w-3 h-3" />
              <span className="text-xs font-mono text-purple-400">fiction</span>
            </label>
          </>
        )}
      </div>
    </div>
  )

  return (
    <>
    {mode === 'edit' && celeb && (
      <CelebDetailHeader
        slug={celeb.slug || ''}
        nickname={formData.nickname || celeb.nickname || ''}
        title={formData.title || celeb.title}
        headline={formData.headline || celeb.headline}
        headlineEn={formData.headline_en || celeb.headline_en}
        celebId={celeb.id}
        claimedBy={celeb.claimed_by}
        createdAt={celeb.created_at}
        isVerified={formData.is_verified}
        status={formData.status}
        tier={formData.celeb_tier}
        contentCount={celeb.content_count || 0}
        onVerified={(value) => { void persistVerified(value) }}
        onStatus={(value) => { void persistPublicationStatus(value) }}
        onTier={(value) => { void persistTier(value) }}
      />
    )}
    <form id="celeb-form" onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">{error}</div>}

      {/* Basic Info */}
      <div className="bg-bg-card border border-border rounded-lg overflow-hidden">
        <button type="button" onClick={() => toggleSection('basicInfo')} className="w-full p-4 flex items-center justify-between hover:bg-white/5">
          <h2 className="text-base font-semibold text-text-primary">기본정보</h2>
          <div className="flex items-center gap-3">
            {!openSections.basicInfo && (formData.headline || formData.profession || formData.nationality) && (
              <span className="text-xs text-text-secondary truncate max-w-[320px]">
                {[formData.headline, CELEB_PROFESSIONS.find(p => p.value === formData.profession)?.label, formData.nationality].filter(Boolean).join(' · ')}
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

            <label htmlFor="headline" className="text-xs font-medium text-text-secondary">한 줄 정의</label>
            <BilingualInput
              mode={langMode}
              ko={<input type="text" id="headline" value={formData.headline} onChange={(e) => handleChange('headline', e.target.value)} placeholder="예: 워런 버핏의 60년 지혜이자 평생 파트너" className={INPUT_CLS} />}
              en={<input type="text" value={formData.headline_en} onChange={(e) => handleChange('headline_en', e.target.value)} placeholder="EN: e.g. Warren Buffett's Lifelong Partner and Mentor" className={INPUT_EN_CLS} />}
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

            {/* 아바타 & 대표 화보 좌우 나란히 배치 */}
            <label className="text-xs font-medium text-text-secondary self-start pt-2">사진·화보</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3 bg-bg-secondary/40 border border-border/80 rounded-xl">
              {/* 아바타 (좌) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-text-primary">아바타</span>
                  <label className="flex items-center gap-1.5 cursor-pointer" onClick={e => e.stopPropagation()}>
                    <input type="checkbox" checked={autoNameFromFile} onChange={toggleAutoName} className="w-3 h-3 rounded border-border bg-bg-secondary text-accent focus:ring-accent" />
                    <span className="text-[10px] text-text-secondary">파일명 → 닉네임</span>
                  </label>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-[130px] shrink-0">
                    <CelebAvatarEditor
                      value={avatarPreview || formData.avatar_url}
                      alt={formData.nickname || '인물'}
                      className="h-[130px] w-[130px] rounded-xl"
                      previewClassName="h-full w-full rounded-xl border-2 border-dashed border-border hover:border-accent hover:bg-accent/5"
                      empty={<AvatarUploadEmpty />}
                      removable
                      loadImmediately
                      highPriority
                      showSavedState={mode === 'edit'}
                      onFileAccepted={applyFileNameAsNickname}
                      onCroppedFile={handleAvatarCrop}
                      onRemove={handleImageRemove}
                      onError={(avatarError) => setError(avatarError.message)}
                    />
                    {mode === 'edit' && celeb && (
                      <CelebAvatarNobgButton
                        celebId={celeb.id}
                        name={formData.nickname}
                        avatarUrl={formData.avatar_url}
                        disabled={avatarFile !== null || formData.avatar_url !== initialFormData.current.avatar_url}
                        onCompleted={handleAvatarNobgCompleted}
                        className="mt-2 w-full text-xs"
                      />
                    )}
                  </div>
                  <div className="flex-1 space-y-1.5 min-w-0">
                    <input
                      type="url"
                      value={formData.avatar_url}
                      onChange={(e) => handleChange('avatar_url', e.target.value)}
                      placeholder="아바타 URL 직접 입력"
                      className="w-full px-2 py-1.5 text-xs bg-bg-secondary border border-border rounded-lg text-text-primary placeholder-text-secondary focus:border-accent focus:outline-none"
                    />
                    <p className="text-[11px] text-text-tertiary leading-normal">
                      목록, 카드 등에 노출되는 1:1 정사각 얼굴 사진입니다.
                    </p>
                  </div>
                </div>
              </div>

              {/* 대표 화보 (우) */}
              <div className="space-y-2 border-t md:border-t-0 md:border-l border-border/80 pt-3 md:pt-0 md:pl-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-text-primary">대표 화보</span>
                  <span className="text-[10px] text-text-tertiary font-mono">{CELEB_HERO_PHOTO_SPEC.aspectLabel}</span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="shrink-0">
                    <CelebPortraitEditor
                      value={portraitPreview || formData.portrait_url}
                      alt={`${formData.nickname || '인물'} 대표 화보`}
                      loadImmediately
                      highPriority
                      onFileAccepted={() => setError(null)}
                      onCroppedFile={handlePortraitCrop}
                      onRemove={handlePortraitRemove}
                      onError={(cropError) => setError(cropError.message)}
                    />
                  </div>
                  <div className="flex-1 space-y-1.5 min-w-0">
                    <input
                      type="url"
                      value={formData.portrait_url}
                      onChange={(e) => handleChange('portrait_url', e.target.value)}
                      placeholder="대표 화보 URL 직접 입력"
                      className="w-full px-2 py-1.5 text-xs bg-bg-secondary border border-border rounded-lg text-text-primary placeholder-text-secondary focus:border-accent focus:outline-none"
                    />
                    <p className="text-[10px] text-text-secondary leading-normal">
                      인물 상세 상단에 걸립니다. 비우면 세력도감 화보 → 아바타 순으로 물러납니다.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {mode === 'create' && (
              <>
                <label className="text-xs font-medium text-text-secondary">옵션</label>
                {options}
              </>
            )}
          </div>
        </div>
        )}
      </div>

      {/* 읽어보기 (기본정보 다음) */}
      {lead}

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

      {children}

      {/* Cultural Journey */}
      <div className="bg-bg-card border border-border rounded-lg overflow-hidden">
        <button type="button" onClick={() => toggleSection('journey')} className="w-full p-4 flex items-center justify-between hover:bg-white/5">
          <h2 className="text-base font-semibold text-text-primary">감상 여정</h2>
          <div className="flex items-center gap-3">
            {!openSections.journey && formData.cultural_journey && (
              <span className="text-xs text-text-secondary">{formData.cultural_journey.length}자</span>
            )}
            {openSections.journey ? <ChevronUp className="w-5 h-5 text-text-secondary" /> : <ChevronDown className="w-5 h-5 text-text-secondary" />}
          </div>
        </button>
        {openSections.journey && (
        <div className="px-4 pb-4 space-y-3">
          {langMode === 'both' ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-xs text-text-secondary">국문</p>
                <textarea ref={journeyTextareaRef} value={formData.cultural_journey} onChange={(e) => handleChange('cultural_journey', e.target.value)} placeholder="감상 여정 (3~4문단)" rows={6} className="w-full px-3 py-2 text-sm bg-bg-secondary border border-border rounded-lg text-text-primary placeholder-text-secondary focus:border-accent focus:outline-none resize-none overflow-hidden" />
                {formData.cultural_journey && (
                  <div className="p-3 bg-bg-secondary/50 border border-border rounded-lg text-sm text-text-primary leading-relaxed space-y-2">
                    {formData.cultural_journey.split('\n\n').map((p, i) => <p key={i}><FormattedText text={p} /></p>)}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <p className="text-xs text-blue-400/70">EN</p>
                <textarea value={formData.cultural_journey_en} onChange={(e) => handleChange('cultural_journey_en', e.target.value)} placeholder="EN: English cultural journey (3-4 paragraphs)" rows={6} className="w-full px-3 py-2 text-xs bg-bg-secondary border border-border/60 rounded-lg text-text-primary placeholder-blue-400/50 focus:border-blue-400/50 focus:outline-none resize-none" />
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
                  <textarea ref={journeyTextareaRef} value={formData.cultural_journey} onChange={(e) => handleChange('cultural_journey', e.target.value)} placeholder="감상 여정 (3~4문단)" rows={6} className="w-full px-3 py-2 text-sm bg-bg-secondary border border-border rounded-lg text-text-primary placeholder-text-secondary focus:border-accent focus:outline-none resize-none overflow-hidden" />
                  {formData.cultural_journey && (
                    <div className="p-3 bg-bg-secondary/50 border border-border rounded-lg text-sm text-text-primary leading-relaxed space-y-2">
                      {formData.cultural_journey.split('\n\n').map((p, i) => <p key={i}><FormattedText text={p} /></p>)}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <textarea value={formData.cultural_journey_en} onChange={(e) => handleChange('cultural_journey_en', e.target.value)} placeholder="EN: English cultural journey (3-4 paragraphs)" rows={6} className="w-full px-3 py-2 text-sm bg-bg-secondary border border-border/60 rounded-lg text-text-primary placeholder-blue-400/50 focus:border-blue-400/50 focus:outline-none resize-none" />
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

      {/* 가상 독백 (보존 데이터 - 현재 서비스 미노출) */}
      <div className="bg-bg-card border border-border rounded-lg overflow-hidden">
        <button type="button" onClick={() => toggleSection('monologue')} className="w-full p-4 flex items-center justify-between hover:bg-white/5">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-text-primary">가상 독백</h2>
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">
              보존 데이터 (서비스 미노출)
            </span>
          </div>
          <div className="flex items-center gap-3">
            {monologueLockedAt && (
              <span className="flex items-center gap-1 text-xs text-amber-400"><Lock className="w-3.5 h-3.5" />확정</span>
            )}
            {!openSections.monologue && celeb?.virtual_monologue && (
              <span className="text-xs text-text-secondary">{celeb.virtual_monologue.length}자</span>
            )}
            {openSections.monologue ? <ChevronUp className="w-5 h-5 text-text-secondary" /> : <ChevronDown className="w-5 h-5 text-text-secondary" />}
          </div>
        </button>
        {openSections.monologue && (
          <div className="px-4 pb-4 space-y-3">
            {mode === 'edit' && celeb?.virtual_monologue && (
              <div className="flex items-center justify-between gap-3 p-3 bg-bg-secondary/50 border border-border rounded-lg">
                <p className="text-xs text-text-secondary">
                  {monologueLockedAt
                    ? `${new Date(monologueLockedAt).toLocaleString('ko-KR')}에 확정되었습니다. 잠금을 해제하기 전까지 어떤 도구로도 수정되지 않습니다.`
                    : '확정하면 생성 스크립트·게시 도구를 포함한 모든 경로의 수정이 차단됩니다.'}
                </p>
                <Button type="button" variant="secondary" onClick={toggleMonologueLock} disabled={monologueLockLoading}>
                  {monologueLockLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : monologueLockedAt ? (
                    <LockOpen className="w-4 h-4" />
                  ) : (
                    <Lock className="w-4 h-4" />
                  )}
                  {monologueLockedAt ? '잠금 해제' : '확정 잠금'}
                </Button>
              </div>
            )}
            {celeb?.virtual_monologue ? (
              <div className="p-3 bg-bg-secondary/50 border border-border rounded-lg text-sm text-text-primary leading-relaxed space-y-2">
                {celeb.virtual_monologue.split('\n\n').map((p, i) => <p key={i}><FormattedText text={p} /></p>)}
              </div>
            ) : (
              <p className="text-sm text-text-secondary">등록된 가상 독백 데이터가 없습니다.</p>
            )}
          </div>
        )}
      </div>

    </form>

    {/* Floating Actions */}
    <div className="fixed bottom-6 right-6 flex items-center gap-3 z-50">
      {isDirty() && (
        <span className="px-2.5 py-1 text-xs font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg shadow-sm">
          수정사항 미저장
        </span>
      )}
      {mode === 'edit' && (
        <Button
          type="button"
          variant="danger"
          onClick={handleDelete}
          disabled={deleteLoading}
          className="!border !border-red-300 !bg-red-500 !text-white shadow-lg shadow-red-950/40 hover:!border-red-200 hover:!bg-red-400 active:!bg-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary"
        >
          {deleteLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}인물 삭제
        </Button>
      )}
      {mode === 'create' && (
        <Button type="button" variant="secondary" onClick={() => router.push(CELEB_LIST_PATH)}>취소</Button>
      )}
      <Button type="submit" form="celeb-form" disabled={loading}>
        {loading ? <><Loader2 className="w-4 h-4 animate-spin" />{mode === 'create' ? '생성 중...' : '저장 중...'}</> : mode === 'create' ? '생성' : '저장'}
      </Button>
    </div>

    </>
  )
}
