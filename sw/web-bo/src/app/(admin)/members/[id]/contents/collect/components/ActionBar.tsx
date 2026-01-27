
import Button from '@/components/ui/Button'
import { Loader2 } from 'lucide-react'

interface ActionBarProps {
  savableCount: number
  saving: boolean
  onSave: () => void
}

export default function ActionBar({ savableCount, saving, onSave }: ActionBarProps) {
  return (
    <div className="flex items-center justify-between bg-bg-card border border-border rounded-xl p-4">
      <p className="text-sm text-text-secondary">
        {savableCount > 0
          ? `${savableCount}개 콘텐츠가 저장됩니다.`
          : '검색 결과를 선택하세요.'}
      </p>
      <Button onClick={onSave} disabled={saving || savableCount === 0}>
        {saving ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            저장 중...
          </>
        ) : (
          `${savableCount}개 저장`
        )}
      </Button>
    </div>
  )
}
