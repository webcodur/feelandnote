'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { promoteToCeleb, type Member } from '@/actions/admin/members'
import { Star, Loader2 } from 'lucide-react'
import Button from '@/components/ui/Button'

interface ProfileTypeSwitchProps {
  member: Member
}

export default function ProfileTypeSwitch({ member }: ProfileTypeSwitchProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  // 셀럽인 경우 표시하지 않음
  if (member.profile_type === 'CELEB') return null

  const handlePromote = async () => {
    if (!confirm('이 사용자를 셀럽으로 승격하시겠습니까?\n\n승격 후에는 셀럽 전용 기능(직군, 영향력, 콘텐츠 관리 등)을 사용할 수 있습니다.')) {
      return
    }

    setLoading(true)
    try {
      await promoteToCeleb(member.id)
      router.refresh()
    } catch (error) {
      console.error('Failed to promote to celeb:', error)
      alert('셀럽 승격에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-bg-card border border-border rounded-lg p-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-text-primary">프로필 유형</h3>
          <p className="text-sm text-text-secondary mt-1">
            현재 일반 사용자입니다. 셀럽으로 승격하면 콘텐츠 관리, 영향력 평가 등 추가 기능을 사용할 수 있습니다.
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={handlePromote}
          disabled={loading}
          className="shrink-0"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Star className="w-4 h-4" />}
          셀럽으로 승격
        </Button>
      </div>
    </div>
  )
}
