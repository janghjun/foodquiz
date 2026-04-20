import type { PlayRecord } from '../history/types'

export const REVIEW_PROMPT_KEY = 'gtm_last_review_prompt'

const MIN_PLAY_COUNT = 2
const MIN_SCORE_PERCENT = 70
const COOLDOWN_DAYS = 7

export function checkReviewEligibility(
  history: PlayRecord[],
  lastPromptAt?: string | null,
): boolean {
  if (history.length < MIN_PLAY_COUNT) return false

  const latest = history[0]
  if (latest.score < MIN_SCORE_PERCENT) return false

  if (lastPromptAt) {
    const last = new Date(lastPromptAt)
    const now = new Date()
    const diffMs = now.getTime() - last.getTime()
    const diffDays = diffMs / (1000 * 60 * 60 * 24)
    if (diffDays < COOLDOWN_DAYS) return false
  }

  return true
}

export function recordReviewPrompt(): void {
  try {
    localStorage.setItem(REVIEW_PROMPT_KEY, new Date().toISOString())
  } catch {
    // ignore storage errors
  }
}

export function getLastReviewPromptAt(): string | null {
  try {
    return localStorage.getItem(REVIEW_PROMPT_KEY)
  } catch {
    return null
  }
}

export function tryRequestReview(history: PlayRecord[]): void {
  const lastPromptAt = getLastReviewPromptAt()
  if (!checkReviewEligibility(history, lastPromptAt)) return

  recordReviewPrompt()
  // TODO: Apps in Toss 리뷰 요청 API 연동
  // e.g. TossReview.requestReview()
}
