// ── 열거형 ───────────────────────────────────────────────────────

/** 트렌드 생명주기 단계 */
export type TrendStatus =
  | 'rising'     // 상승 중 — SNS/카페 확산 초기
  | 'active'     // 현재 활성 — 일반 대중화 단계
  | 'peak'       // 정점 — 최고 인지도
  | 'declining'  // 하락 중 — 트렌드 소멸 진행
  | 'archived'   // 종료 — 더 이상 활성 트렌드 아님

/** 트렌드 최초 포착 출처 */
export type SourceType =
  | 'sns'          // 인스타그램, 틱톡 등
  | 'news'         // 뉴스·매거진 기사
  | 'cafe_menu'    // 카페 신메뉴 출시
  | 'convenience'  // 편의점 신상품
  | 'restaurant'   // 음식점 메뉴
  | 'homecook'     // 홈쿡 / 홈베이킹 커뮤니티

/** 카테고리 — quiz CategoryKey와 동일하게 매핑 */
export type CandidateCategory =
  | 'dessert'      // dessert_trend
  | 'snack'        // snack_recall
  | 'convenience'  // convenience_dessert
  | 'meal'         // solo_meal
  | 'wellness'     // wellness_food
  | 'drink'        // 음료 (카테고리 확장 대비)

/** C 등급 제외 — 근거가 충분한 항목만 등록 */
export type CandidateEvidenceLevel = 'A' | 'B'

// ── 핵심 타입 ─────────────────────────────────────────────────────

export interface TrendFoodCandidate {
  /** 고유 식별자 (cnd_xxx 형식 권장) */
  id: string
  /** 대표 이름 */
  name: string
  /** 이칭·줄임말 (검색·매핑 보조용) */
  aliases?: string[]
  /** 카테고리 분류 */
  category: CandidateCategory
  /** 트렌드 포착 출처 (복수 가능) */
  sourceType: SourceType | SourceType[]
  /** 처음 관찰된 날짜 (YYYY-MM-DD) */
  firstSeenAt: string
  /** 피크 시작 추정일 (YYYY-MM-DD) */
  peakStartAt?: string
  /** 피크 종료 추정일 (YYYY-MM-DD) */
  peakEndAt?: string
  /** 현재 트렌드 단계 */
  trendStatus: TrendStatus
  /** 이미지 생성·검색·에셋 태깅에 활용할 시각적 키워드 */
  visualKeywords: string[]
  /** 퀴즈 태그·필터용 레이블 */
  tags: string[]
  /** 근거 수준 — C 제외 */
  evidenceLevel: CandidateEvidenceLevel
  /** 큐레이터 메모 (선택) */
  sourceNotes?: string
  /**
   * true = 문항 작성에 필요한 정보(피크 시기, 근거)가 충분함.
   * 명시하지 않으면 selectors에서 조건으로 계산.
   */
  questionReady?: boolean
}
