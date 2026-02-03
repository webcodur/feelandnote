import { redirect } from 'next/navigation'

// 기존 /members 경로는 /users로 리다이렉트
export default function MembersPage() {
  redirect('/users')
}
