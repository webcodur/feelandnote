// 상태 조회와 운영 안내가 함께 사용하는 서버 구성. 크기를 바꾸면 여기에도 반영한다.
export const ORACLE_SERVERS = {
  web: {
    name: 'feelandnote-web',
    address: '158.179.194.105',
    shape: 'VM.Standard.E4.Flex',
    ocpus: 1,
    memoryGB: 3,
    baselinePercent: 12.5,
    bootVolumeGB: 47,
  },
  database: {
    name: 'feelandnote-db-a1',
    address: '152.67.198.197',
    shape: 'VM.Standard.A1.Flex',
    ocpus: 2,
    memoryGB: 12,
    bootVolumeGB: 47,
  },
} as const
