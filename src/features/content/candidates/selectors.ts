import type {
  TrendFoodCandidate,
  TrendStatus,
  CandidateCategory,
  CandidateEvidenceLevel,
} from './types'

// ── 상수 ──────────────────────────────────────────────────────────

/** seasonal pack 후보로 고려할 트렌드 상태 */
const SEASONAL_ELIGIBLE_STATUSES: TrendStatus[] = ['rising', 'active', 'peak']

/** questionReady 자동 판정 조건 */
const AUTO_READY_EVIDENCE: CandidateEvidenceLevel = 'A'

// ── 필터 ──────────────────────────────────────────────────────────

/** archived 제외 — 현재 활성 후보만 반환 */
export function getActiveCandidates(
  candidates: TrendFoodCandidate[],
): TrendFoodCandidate[] {
  return candidates.filter((c) => c.trendStatus !== 'archived')
}

/** 특정 trendStatus 후보만 반환 */
export function getCandidatesByStatus(
  candidates: TrendFoodCandidate[],
  status: TrendStatus,
): TrendFoodCandidate[] {
  return candidates.filter((c) => c.trendStatus === status)
}

/** 카테고리별 후보 반환 */
export function getCandidatesByCategory(
  candidates: TrendFoodCandidate[],
  category: CandidateCategory,
): TrendFoodCandidate[] {
  return candidates.filter((c) => c.category === category)
}

// ── 문항 준비 판정 ────────────────────────────────────────────────

/**
 * 후보가 seasonal pack 문항 작성에 충분한지 판단합니다.
 *
 * 조건:
 * - `questionReady: true` 가 명시된 경우 즉시 true
 * - 또는 evidenceLevel A + peakStartAt 존재 + archived 아님
 */
export function isQuestionReady(candidate: TrendFoodCandidate): boolean {
  if (candidate.questionReady === true) return true
  if (candidate.questionReady === false) return false
  return (
    candidate.evidenceLevel === AUTO_READY_EVIDENCE &&
    candidate.peakStartAt !== undefined &&
    candidate.trendStatus !== 'archived'
  )
}

// ── seasonal pack 후보 추출 ───────────────────────────────────────

/**
 * seasonal pack에 포함할 수 있는 후보 목록을 반환합니다.
 *
 * 조건:
 * - trendStatus가 SEASONAL_ELIGIBLE_STATUSES 중 하나
 * - isQuestionReady === true
 * - archived 아님 (status 조건에 이미 포함)
 */
export function getSeasonPackCandidates(
  candidates: TrendFoodCandidate[],
): TrendFoodCandidate[] {
  return candidates.filter(
    (c) =>
      SEASONAL_ELIGIBLE_STATUSES.includes(c.trendStatus) &&
      isQuestionReady(c),
  )
}

/**
 * 특정 카테고리의 seasonal pack 후보를 반환합니다.
 * 카테고리별 섹션 구성 시 활용합니다.
 */
export function getSeasonPackCandidatesByCategory(
  candidates: TrendFoodCandidate[],
  category: CandidateCategory,
): TrendFoodCandidate[] {
  return getSeasonPackCandidates(candidates).filter((c) => c.category === category)
}

// ── Schema 검증 ──────────────────────────────────────────────────

const VALID_TREND_STATUSES: TrendStatus[] = ['rising', 'active', 'peak', 'declining', 'archived']
const VALID_EVIDENCE_LEVELS: CandidateEvidenceLevel[] = ['A', 'B']
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export interface CandidateValidationResult {
  ok: boolean
  errors: string[]
}

/** 후보 항목 하나의 schema를 검증합니다 */
export function validateCandidate(c: TrendFoodCandidate): CandidateValidationResult {
  const errors: string[] = []

  if (!c.id?.trim()) errors.push('id 필수')
  if (!c.name?.trim()) errors.push('name 필수')
  if (!VALID_TREND_STATUSES.includes(c.trendStatus)) errors.push(`trendStatus 유효하지 않음: ${c.trendStatus}`)
  if (!VALID_EVIDENCE_LEVELS.includes(c.evidenceLevel)) errors.push(`evidenceLevel 유효하지 않음: ${c.evidenceLevel}`)
  if (!DATE_RE.test(c.firstSeenAt)) errors.push(`firstSeenAt 형식 오류: ${c.firstSeenAt}`)
  if (c.peakStartAt && !DATE_RE.test(c.peakStartAt)) errors.push(`peakStartAt 형식 오류: ${c.peakStartAt}`)
  if (c.peakEndAt && !DATE_RE.test(c.peakEndAt)) errors.push(`peakEndAt 형식 오류: ${c.peakEndAt}`)
  if (!Array.isArray(c.visualKeywords) || c.visualKeywords.length === 0) errors.push('visualKeywords 최소 1개 필요')
  if (!Array.isArray(c.tags) || c.tags.length === 0) errors.push('tags 최소 1개 필요')

  return { ok: errors.length === 0, errors }
}

/** 레지스트리 전체 검증 */
export function validateRegistry(
  candidates: TrendFoodCandidate[],
): { valid: TrendFoodCandidate[]; invalid: Array<{ candidate: TrendFoodCandidate; errors: string[] }> } {
  const valid: TrendFoodCandidate[] = []
  const invalid: Array<{ candidate: TrendFoodCandidate; errors: string[] }> = []

  for (const c of candidates) {
    const result = validateCandidate(c)
    if (result.ok) valid.push(c)
    else invalid.push({ candidate: c, errors: result.errors })
  }

  return { valid, invalid }
}
