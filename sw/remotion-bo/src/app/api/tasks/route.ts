import { NextResponse } from 'next/server'
import { getTasks } from '@/lib/server-utils'

export async function GET() {
  return NextResponse.json(getTasks())
}
