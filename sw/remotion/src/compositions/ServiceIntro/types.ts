export interface SceneData {
  id: string
  durationFrames: number
  texts: string[]
  subText?: string
  transition: 'fade' | 'cut' | 'dissolve'
}

export const scenes: SceneData[] = [
  {
    id: 'hook',
    durationFrames: 180,
    texts: ['알렉산더 대왕은 단검과 함께', '일리아스를 베개 밑에 두고 잤다.'],
    transition: 'fade',
  },
  {
    id: 'quote',
    durationFrames: 160,
    texts: ['트로이에 당도한 그는', '아킬레우스의 무덤 앞을 달리며 말했다.'],
    subText: '"살아서는 벗이 있었고, 죽어서는 호메로스가 노래했으니."',
    transition: 'dissolve',
  },
  {
    id: 'culturalJourney',
    durationFrames: 140,
    texts: ['원정 중 책이 부족해지자', '비극 전집을 보내달라 편지를 썼다.'],
    transition: 'dissolve',
  },
  {
    id: 'bridge',
    durationFrames: 100,
    texts: ['이 모든 기록이', '한 곳에 있다면.'],
    transition: 'dissolve',
  },
  {
    id: 'scale',
    durationFrames: 200,
    texts: ['이런 인물이', '1,000명 이상.'],
    transition: 'cut',
  },
  {
    id: 'connect',
    durationFrames: 160,
    texts: ['그가 읽은 책을', '내 서재에 담는다.'],
    transition: 'dissolve',
  },
  {
    id: 'cta',
    durationFrames: 180,
    texts: ['FEEL AND NOTE'],
    subText: '기록은 감각이 된다',
    transition: 'fade',
  },
]

export const totalFrames = scenes.reduce((sum, s) => sum + s.durationFrames, 0)
