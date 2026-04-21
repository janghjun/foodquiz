import { describe, it, expect } from 'vitest'
import {
  computeReviewEligibility,
  MIN_PLAY_COUNT,
  MIN_SCORE_RATE,
  COOLDOWN_DAYS,
} from './reviewEligibility'
import type { EligibilityInput } from './reviewEligibility'

const NOW = '2026-04-21T12:00:00.000Z'

function makeInput(overrides: Partial<EligibilityInput> = {}): EligibilityInput {
  return {
    totalPlays:       MIN_PLAY_COUNT,
    latestScore:      MIN_SCORE_RATE,
    lastPromptAt:     null,
    sessionCompleted: true,
    nowIso:           NOW,
    ...overrides,
  }
}

// ── 개별 조건 ────────────────────────────────────────────────────

describe('computeReviewEligibility — 세션 완주', () => {
  it('sessionCompleted false이면 session_incomplete 반환', () => {
    const r = computeReviewEligibility(makeInput({ sessionCompleted: false }))
    expect(r.eligible).toBe(false)
    expect(r.reason).toBe('session_incomplete')
  })

  it('sessionCompleted true이면 이 조건을 통과한다', () => {
    const r = computeReviewEligibility(makeInput({ sessionCompleted: true }))
    expect(r.eligible).toBe(true)
  })
})

describe('computeReviewEligibility — 플레이 횟수', () => {
  it(`${MIN_PLAY_COUNT - 1}회 미만이면 insufficient_plays 반환`, () => {
    const r = computeReviewEligibility(makeInput({ totalPlays: MIN_PLAY_COUNT - 1 }))
    expect(r.eligible).toBe(false)
    expect(r.reason).toBe('insufficient_plays')
  })

  it(`${MIN_PLAY_COUNT}회 이상이면 통과`, () => {
    const r = computeReviewEligibility(makeInput({ totalPlays: MIN_PLAY_COUNT }))
    expect(r.eligible).toBe(true)
  })
})

describe('computeReviewEligibility — 최근 점수', () => {
  it('latestScore null이면 low_score 반환', () => {
    const r = computeReviewEligibility(makeInput({ latestScore: null }))
    expect(r.eligible).toBe(false)
    expect(r.reason).toBe('low_score')
  })

  it(`점수 ${MIN_SCORE_RATE * 100}% 미만이면 low_score 반환`, () => {
    const r = computeReviewEligibility(makeInput({ latestScore: MIN_SCORE_RATE - 0.01 }))
    expect(r.eligible).toBe(false)
    expect(r.reason).toBe('low_score')
  })

  it(`점수 ${MIN_SCORE_RATE * 100}% 정확히 충족하면 통과`, () => {
    const r = computeReviewEligibility(makeInput({ latestScore: MIN_SCORE_RATE }))
    expect(r.eligible).toBe(true)
  })

  it('점수 100%이면 통과', () => {
    const r = computeReviewEligibility(makeInput({ latestScore: 1.0 }))
    expect(r.eligible).toBe(true)
  })
})

describe('computeReviewEligibility — 쿨다운', () => {
  it(`최근 ${COOLDOWN_DAYS}일 이내 요청이 있으면 cooldown_active 반환`, () => {
    const recentDays = COOLDOWN_DAYS - 1
    const lastPromptAt = new Date(
      new Date(NOW).getTime() - recentDays * 24 * 60 * 60 * 1000,
    ).toISOString()
    const r = computeReviewEligibility(makeInput({ lastPromptAt }))
    expect(r.eligible).toBe(false)
    expect(r.reason).toBe('cooldown_active')
  })

  it(`${COOLDOWN_DAYS}일 초과면 통과`, () => {
    const oldDays = COOLDOWN_DAYS + 1
    const lastPromptAt = new Date(
      new Date(NOW).getTime() - oldDays * 24 * 60 * 60 * 1000,
    ).toISOString()
    const r = computeReviewEligibility(makeInput({ lastPromptAt }))
    expect(r.eligible).toBe(true)
  })

  it('lastPromptAt null이면 쿨다운 없음', () => {
    const r = computeReviewEligibility(makeInput({ lastPromptAt: null }))
    expect(r.eligible).toBe(true)
  })
})

// ── 판정 순서 (우선순위) ─────────────────────────────────────────

describe('computeReviewEligibility — 판정 순서', () => {
  it('session_incomplete가 insufficient_plays보다 먼저 반환된다', () => {
    const r = computeReviewEligibility(makeInput({
      sessionCompleted: false,
      totalPlays: 0,
    }))
    expect(r.reason).toBe('session_incomplete')
  })

  it('insufficient_plays가 low_score보다 먼저 반환된다', () => {
    const r = computeReviewEligibility(makeInput({
      totalPlays: 0,
      latestScore: 0,
    }))
    expect(r.reason).toBe('insufficient_plays')
  })

  it('low_score가 cooldown_active보다 먼저 반환된다', () => {
    const recentPrompt = new Date(new Date(NOW).getTime() - 1000).toISOString()
    const r = computeReviewEligibility(makeInput({
      latestScore: 0,
      lastPromptAt: recentPrompt,
    }))
    expect(r.reason).toBe('low_score')
  })
})

// ── 모두 충족 ────────────────────────────────────────────────────

describe('computeReviewEligibility — 전체 조건 충족', () => {
  it('모든 조건 충족 시 eligible: true, reason 없음', () => {
    const r = computeReviewEligibility(makeInput())
    expect(r.eligible).toBe(true)
    expect(r.reason).toBeUndefined()
  })
})
