import type { UserQuizState } from '../state/userQuizState'
import type { QuizSession } from '../quiz/types'
import { STORAGE_KEYS } from '../../constants/storageKeys'
import { computeReviewEligibility } from './reviewEligibility'

export const REVIEW_PROMPT_KEY = STORAGE_KEYS.REVIEW_PROMPT

// ── 저장소 ───────────────────────────────────────────────────────

export function recordReviewPrompt(): void {
  try {
    localStorage.setItem(REVIEW_PROMPT_KEY, new Date().toISOString())
  } catch {
    // 저장 실패 무시
  }
}

export function getLastReviewPromptAt(): string | null {
  try {
    return localStorage.getItem(REVIEW_PROMPT_KEY)
  } catch {
    return null
  }
}

// ── 리뷰 요청 진입점 ─────────────────────────────────────────────

/**
 * eligibility 체크 후 조건 충족 시 requestReview를 호출합니다.
 *
 * - 오류 없이 완주한 세션에서만 호출하세요 (ResultPage).
 * - 실제 API 호출 실패해도 UX 흐름이 중단되지 않습니다.
 */
export function tryRequestReview(state: UserQuizState, session: QuizSession): void {
  const result = computeReviewEligibility({
    totalPlays:       state.history.length,
    latestScore:      state.latestScore,
    lastPromptAt:     getLastReviewPromptAt(),
    sessionCompleted: session.completedAt !== null,
  })

  if (!result.eligible) return

  recordReviewPrompt()

  try {
    // Apps in Toss 리뷰 요청 API — 미주입 환경(웹, 테스트)에서는 no-op
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tossReview = (window as any).TossReview
    if (typeof tossReview?.requestReview === 'function') {
      tossReview.requestReview()
    }
  } catch {
    // 호출 실패 시 조용히 무시 — 사용자 흐름 보호
  }
}
