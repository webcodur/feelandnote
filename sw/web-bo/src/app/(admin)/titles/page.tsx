import { createClient } from '@/lib/supabase/server'
import { Award, Plus, Users, Star, Zap, Trophy, Target, Heart, Sparkles } from 'lucide-react'
import Button from '@/components/ui/Button'

const CATEGORY_CONFIG = {
  volume: { label: '양', color: 'bg-blue-500/10 text-blue-400', icon: Target },
  diversity: { label: '다양성', color: 'bg-green-500/10 text-green-400', icon: Sparkles },
  consistency: { label: '꾸준함', color: 'bg-purple-500/10 text-purple-400', icon: Zap },
  depth: { label: '깊이', color: 'bg-orange-500/10 text-orange-400', icon: Star },
  social: { label: '소셜', color: 'bg-pink-500/10 text-pink-400', icon: Heart },
  special: { label: '특별', color: 'bg-yellow-500/10 text-yellow-400', icon: Trophy },
}

const GRADE_CONFIG = {
  common: { label: '일반', color: 'text-gray-400 border-gray-500/30', bgColor: 'bg-gray-500/10' },
  uncommon: { label: '고급', color: 'text-green-400 border-green-500/30', bgColor: 'bg-green-500/10' },
  rare: { label: '희귀', color: 'text-blue-400 border-blue-500/30', bgColor: 'bg-blue-500/10' },
  epic: { label: '영웅', color: 'text-purple-400 border-purple-500/30', bgColor: 'bg-purple-500/10' },
  legendary: { label: '전설', color: 'text-yellow-400 border-yellow-500/30', bgColor: 'bg-yellow-500/10' },
}

export default async function TitlesPage() {
  const supabase = await createClient()

  const { data: titles, count } = await supabase
    .from('titles')
    .select('*', { count: 'exact' })
    .order('sort_order', { ascending: true })

  const total = count || 0

  // 칭호별 획득자 수 조회
  const titleIds = (titles || []).map(t => t.id)
  const { data: unlockedCounts } = await supabase
    .from('user_titles')
    .select('title_id')
    .in('title_id', titleIds)

  const unlockedCountMap = (unlockedCounts || []).reduce((acc, item) => {
    acc[item.title_id] = (acc[item.title_id] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">칭호 관리</h1>
          <p className="text-text-secondary mt-1">총 {total.toLocaleString()}개의 칭호</p>
        </div>
        <Button>
          <Plus className="w-4 h-4" />
          새 칭호 추가
        </Button>
      </div>

      {/* Titles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {!titles || titles.length === 0 ? (
          <div className="col-span-full bg-bg-card border border-border rounded-xl p-12 text-center">
            <Award className="w-12 h-12 text-text-secondary mx-auto mb-4" />
            <p className="text-text-secondary">등록된 칭호가 없습니다</p>
          </div>
        ) : (
          titles.map((title) => {
            const categoryConfig = CATEGORY_CONFIG[title.category as keyof typeof CATEGORY_CONFIG]
            const gradeConfig = GRADE_CONFIG[title.grade as keyof typeof GRADE_CONFIG]
            const CategoryIcon = categoryConfig?.icon || Award
            const unlockedCount = unlockedCountMap[title.id] || 0

            return (
              <div
                key={title.id}
                className={`bg-bg-card border rounded-xl p-6 hover:border-accent/50 ${gradeConfig?.color || 'border-border'}`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 rounded-lg ${gradeConfig?.bgColor || 'bg-accent/10'}`}>
                    <CategoryIcon className={`w-6 h-6 ${gradeConfig?.color.split(' ')[0] || 'text-accent'}`} />
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${gradeConfig?.bgColor} ${gradeConfig?.color.split(' ')[0]}`}>
                    {gradeConfig?.label || title.grade}
                  </span>
                </div>

                {/* Title Name */}
                <h3 className="text-lg font-semibold text-text-primary mb-2">
                  {title.name}
                </h3>

                {/* Description */}
                <p className="text-sm text-text-secondary line-clamp-2 mb-4">
                  {title.description || '설명 없음'}
                </p>

                {/* Stats */}
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex items-center gap-1.5">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${categoryConfig?.color || 'bg-gray-500/10 text-gray-400'}`}>
                      {categoryConfig?.label || title.category}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-text-secondary">
                    <Star className="w-3.5 h-3.5 text-yellow-400" />
                    <span>+{title.bonus_score}</span>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <div className="flex items-center gap-1 text-sm text-text-secondary">
                    <Users className="w-3.5 h-3.5" />
                    <span>{unlockedCount}명 획득</span>
                  </div>
                  <Button unstyled className="text-sm text-accent hover:underline">
                    수정
                  </Button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
