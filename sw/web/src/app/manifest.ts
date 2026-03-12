import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Feel&Note - 감상 아카이브',
    short_name: 'Feel&Note',
    description: '셀럽들의 감상 기록을 탐색하고, 나만의 문화 기록을 남기는 플랫폼',
    start_url: '/',
    display: 'standalone',
    background_color: '#0a0a0a',
    theme_color: '#c8a97e',
    icons: [
      { src: '/favicon.ico', sizes: '16x16 32x32 48x48', type: 'image/x-icon' },
    ],
  }
}
