'use client'

import { useEffect, useRef } from 'react'
import { Search } from 'lucide-react'
import { CELEB_PROFESSIONS } from '@/constants/celebCategories'
import Button from '@/components/ui/Button'

interface CelebFilterProps {
  defaultValues: {
    search: string
    status: string
    profession: string
  }
}

export default function CelebFilter({ defaultValues }: CelebFilterProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const { search, status, profession } = defaultValues

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
      const len = inputRef.current.value.length
      inputRef.current.setSelectionRange(len, len)
    }
  }, [])

  return (
    <div className="bg-bg-card border border-border rounded-lg p-3 md:p-4">
      <form className="flex flex-col sm:flex-row flex-wrap gap-2 md:gap-3">
        <div className="flex-1 min-w-0 sm:min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
            <input
              ref={inputRef}
              type="text"
              name="search"
              defaultValue={search}
              placeholder="셀럽 이름 검색..."
              className="w-full pl-10 pr-4 py-2 bg-bg-secondary border border-border rounded-lg text-sm text-text-primary placeholder-text-secondary focus:border-accent focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:flex gap-2 md:gap-3">
          <select
            name="status"
            defaultValue={status}
            className="px-3 py-2 bg-bg-secondary border border-border rounded-lg text-sm text-text-primary focus:border-accent focus:outline-none"
          >
            <option value="all">모든 상태</option>
            <option value="active">활성</option>
            <option value="suspended">정지</option>
          </select>

          <select
            name="profession"
            defaultValue={profession}
            className="px-3 py-2 bg-bg-secondary border border-border rounded-lg text-sm text-text-primary focus:border-accent focus:outline-none"
          >
            <option value="all">모든 직군</option>
            {CELEB_PROFESSIONS.map((prof) => (
              <option key={prof.value} value={prof.value}>
                {prof.label}
              </option>
            ))}
          </select>
        </div>

        <Button type="submit" size="sm" className="w-full sm:w-auto">
          검색
        </Button>
      </form>
    </div>
  )
}
