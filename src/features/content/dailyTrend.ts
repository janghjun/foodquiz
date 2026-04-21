// ── 타입 ──────────────────────────────────────────────────────────

export interface TrendBite {
  id: string
  title: string        // "우베 라떼"
  description: string  // 한 줄 설명
  tags: string[]       // ["디저트", "카페"]
  /** 연결할 카테고리 quiz key (CATEGORIES[].key) */
  categoryKey?: string
  /** 연결할 seasonal pack ID */
  packId?: string
}

// ── 큐레이션 데이터 ───────────────────────────────────────────────

export const TREND_BITES: TrendBite[] = [
  {
    id: 'tb01',
    title: '우베 라떼',
    description: '필리핀산 보라 고구마 우베가 국내 카페 디저트로 빠르게 확산되고 있어요.',
    tags: ['디저트', '카페', '2024'],
    categoryKey: 'dessert',
    packId: 'mz-trend-2026-q2',
  },
  {
    id: 'tb02',
    title: '탕후루',
    description: '새콤달콤한 과일 탕후루가 길거리 간식 트렌드를 이끌었어요.',
    tags: ['간식', '길거리'],
    categoryKey: 'snack',
    packId: 'mz-trend-2026-q2',
  },
  {
    id: 'tb03',
    title: '흑임자 라떼',
    description: '고소하고 진한 흑임자가 카페 음료와 디저트에서 큰 인기를 얻었어요.',
    tags: ['디저트', '웰니스'],
    categoryKey: 'dessert',
    packId: 'mz-trend-2026-q2',
  },
  {
    id: 'tb04',
    title: '편의점 디저트 고급화',
    description: '편의점 디저트가 카페 수준으로 업그레이드되며 가성비 끝판왕이 됐어요.',
    tags: ['편의점', '디저트'],
    categoryKey: 'convenience',
  },
  {
    id: 'tb05',
    title: '마라탕 & 마라샹궈',
    description: '얼얼하고 매운 마라 열풍이 혼밥 문화와 만나 일상 메뉴가 됐어요.',
    tags: ['한 끼', '중식'],
    categoryKey: 'meal',
  },
  {
    id: 'tb06',
    title: '제로 칼로리 음료',
    description: '설탕 없이 단맛을 내는 제로 음료가 편의점 베스트셀러를 차지했어요.',
    tags: ['건강식', '편의점'],
    categoryKey: 'wellness',
  },
  {
    id: 'tb07',
    title: '바스크 치즈케이크',
    description: '겉이 검게 탄 비주얼이 SNS를 장악하며 홈베이킹 열풍을 이끌었어요.',
    tags: ['디저트', 'SNS'],
    categoryKey: 'dessert',
    packId: 'mz-trend-2026-q2',
  },
  {
    id: 'tb08',
    title: '그래놀라 요거트 볼',
    description: '건강하고 예쁜 한 끼로 브런치 카페와 홈 식사에 자리 잡았어요.',
    tags: ['건강식', '브런치'],
    categoryKey: 'wellness',
  },
  {
    id: 'tb09',
    title: '마카롱 소금버터맛',
    description: '달콤짭짤한 소금버터 마카롱이 디저트 브랜드 필수 메뉴가 됐어요.',
    tags: ['디저트', '카페'],
    categoryKey: 'dessert',
    packId: 'mz-trend-2026-q2',
  },
  {
    id: 'tb10',
    title: '혼밥 전문 식당',
    description: '1인 전용 좌석과 메뉴를 갖춘 혼밥 맛집이 MZ 세대의 핫플이 됐어요.',
    tags: ['한 끼', '혼밥'],
    categoryKey: 'meal',
  },
]

// ── 날짜 기반 선택 ────────────────────────────────────────────────

function dateHash(dateKey: string, max: number): number {
  let h = 0
  for (const c of dateKey) h = ((h * 31) + c.charCodeAt(0)) >>> 0
  return h % max
}

/**
 * dateKey(YYYY-MM-DD) 기준으로 오늘의 트렌드 바이트를 반환합니다.
 * 같은 날짜는 항상 같은 항목을 반환합니다 (결정적).
 * 데이터가 없으면 null을 반환합니다.
 */
export function getDailyTrendBite(dateKey?: string): TrendBite | null {
  if (TREND_BITES.length === 0) return null
  const key = dateKey ?? new Date().toISOString().slice(0, 10)
  return TREND_BITES[dateHash(key, TREND_BITES.length)]
}
