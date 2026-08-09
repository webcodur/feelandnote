import type { Metadata } from 'next'
import { Award } from 'lucide-react'
import {
  TITLES,
  TITLE_CATEGORY_CONFIG,
  TITLE_GRADE_CONFIG,
  TITLE_ICONS,
  type TitleCategory,
  type TitleGrade,
} from '@/../../web/src/constants/titles'

export const metadata: Metadata = {
  title: '칭호 목록',
}

export default function TitlesPage() {
  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-text-primary">칭호 목록</h1>
        <p className="text-sm text-text-secondary mt-1">
          칭호는 코드 상수에서 관리하며 회원의 기록을 기준으로 실시간 판정합니다. 총{' '}
          {TITLES.length.toLocaleString()}개
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        {TITLES.length === 0 ? (
          <div className="col-span-full bg-bg-card border border-border rounded-xl p-12 text-center">
            <Award className="w-12 h-12 text-text-secondary mx-auto mb-4" />
            <p className="text-text-secondary">등록된 칭호가 없습니다.</p>
          </div>
        ) : (
          TITLES.map((title) => {
            const categoryConfig = TITLE_CATEGORY_CONFIG[title.category as TitleCategory]
            const gradeConfig = TITLE_GRADE_CONFIG[title.grade as TitleGrade]
            const CategoryIcon = categoryConfig.icon
            const TitleIcon = title.icon ? TITLE_ICONS[title.icon] : CategoryIcon

            return (
              <article
                key={title.code}
                className={`bg-bg-card border rounded-xl p-6 hover:border-accent/50 ${gradeConfig.borderColor}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 rounded-lg ${gradeConfig.bgColor}`}>
                    <TitleIcon className={`w-6 h-6 ${gradeConfig.color}`} />
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${gradeConfig.bgColor} ${gradeConfig.color}`}>
                    {gradeConfig.label}
                  </span>
                </div>

                <h2 className="text-lg font-semibold text-text-primary mb-2">{title.name}</h2>
                <p className="text-sm text-text-secondary min-h-10 mb-4">{title.description}</p>

                <div className="flex items-center justify-between gap-3 pt-4 border-t border-border">
                  <span className={`text-xs font-medium ${categoryConfig.color}`}>
                    {categoryConfig.label}
                  </span>
                  <code className="text-xs text-text-secondary">
                    {title.condition.type} ≥ {title.condition.value}
                  </code>
                </div>
              </article>
            )
          })
        )}
      </div>
    </div>
  )
}
