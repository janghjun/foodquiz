// ── 상수 ──────────────────────────────────────────────────────────

export const MIN_PLAY_COUNT  = 2
export const MIN_SCORE_RATE  = 0.70   // 0~1 기준
export const COOLDOWN_DAYS   = 7

// ── 타입 ──────────────────────────────────────────────────────────

export interface EligibilityInput {
  /** UserQuizState.history.length */
  totalPlays: number
  /** UserQuizState.latestScore (0~1), 없으면 null */
  latestScore: number | null
  /** localStorage에서 읽은 마지막 요청 ISO 시각, 없으면 null */
  lastPromptAt: string | null
  /** session.completedAt !== null — 오류 없이 완주한 세션인지 */
  sessionCompleted: boolean
  /** 테스트용 현재 시각 주입 (기본: new Date()) */
  nowIso?: string
}

export type IneligibleReason =
  | 'session_incomplete'   // 세션이 완주되지 않음
  | 'insufficient_plays'   // 플레이 횟수 부족
  | 'low_score'            // 최근 점수 70% 미만
  | 'cooldown_active'      // 7일 쿨다운 중

export interface ReviewEligibilityResult {
  eligible: boolean
  reason?: IneligibleReason
}

// ── 핵심 계산 (순수 함수) ─────────────────────────────────────────

/**
 * 주어진 입력으로 리뷰 요청 eligibility를 판정합니다.
 * 모든 입력은 외부에서 주입되며, side effect가 없습니다.
 *
 * 판정 순서:
 * 1. 세션 완주 (오류 없이 끝난 세션만)
 * 2. 플레이 횟수 >= MIN_PLAY_COUNT
 * 3. 최근 점수 >= MIN_SCORE_RATE
 * 4. 쿨다운 (최근 COOLDOWN_DAYS 이내 중복 요청 없음)
 */
export function computeReviewEligibility(input: EligibilityInput): ReviewEligibilityResult {
  const { totalPlays, latestScore, lastPromptAt, sessionCompleted, nowIso } = input
  const now = nowIso ? new Date(nowIso) : new Date()

  if (!sessionCompleted) {
    return { eligible: false, reason: 'session_incomplete' }
  }

  if (totalPlays < MIN_PLAY_COUNT) {
    return { eligible: false, reason: 'insufficient_plays' }
  }

  if (latestScore === null || latestScore < MIN_SCORE_RATE) {
    return { eligible: false, reason: 'low_score' }
  }

  if (lastPromptAt) {
    const diffDays = (now.getTime() - new Date(lastPromptAt).getTime()) / (1000 * 60 * 60 * 24)
    if (diffDays < COOLDOWN_DAYS) {
      return { eligible: false, reason: 'cooldown_active' }
    }
  }

  return { eligible: true }
}
