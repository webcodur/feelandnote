'use client'

import { useEffect, useRef } from 'react'
import { Search } from 'lucide-react'
import { CELEB_PROFESSIONS } from '@/constants/celebCategories'
import Button from '@/components/ui/Button'

interface MembersFilterProps {
  defaultValues: {
    search: string
    type: string
    status: string
    role: string
    profession: string
  }
}

export default function MembersFilter({ defaultValues }: MembersFilterProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const { search, type, status, role, profession } = defaultValues

  useEffect(() => {
    // 페이지 진입 시 검색창에 포커스
    if (inputRef.current) {
      inputRef.current.focus()
      // 값이 있다면 커서를 끝으로 이동
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
              placeholder="닉네임 또는 이메일 검색..."
              className="w-full pl-10 pr-4 py-2 bg-bg-secondary border border-border rounded-lg text-sm text-text-primary placeholder-text-secondary focus:border-accent focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:flex gap-2 md:gap-3">
          <select
            name="type"
            defaultValue={type}
            className="px-3 py-2 bg-bg-secondary border border-border rounded-lg text-sm text-text-primary focus:border-accent focus:outline-none"
          >
            <option value="all">전체 타입</option>
            <option value="user">사용자</option>
            <option value="celeb">셀럽</option>
          </select>

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
            name="role"
            defaultValue={role}
            className="px-3 py-2 bg-bg-secondary border border-border rounded-lg text-sm text-text-primary focus:border-accent focus:outline-none"
          >
            <option value="all">모든 역할</option>
            <option value="user">일반</option>
            <option value="admin">관리자</option>
            <option value="super_admin">최고관리자</option>
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
