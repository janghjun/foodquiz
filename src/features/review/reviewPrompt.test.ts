import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  tryRequestReview,
  recordReviewPrompt,
  getLastReviewPromptAt,
  REVIEW_PROMPT_KEY,
} from './reviewPrompt'
import { defaultUserQuizState } from '../state/userQuizState'
import type { UserQuizState } from '../state/userQuizState'
import type { QuizSession } from '../quiz/types'
import { MIN_PLAY_COUNT, MIN_SCORE_RATE, COOLDOWN_DAYS } from './reviewEligibility'

// ── 픽스처 ───────────────────────────────────────────────────────

function makeState(overrides: Partial<UserQuizState> = {}): UserQuizState {
  return {
    ...defaultUserQuizState(),
    history: Array.from({ length: MIN_PLAY_COUNT }, (_, i) => ({
      sessionId:    `s${i}`,
      sessionType:  'normal' as const,
      playedAt:     new Date().toISOString(),
      correctCount: 8,
      totalCount:   10,
      score:        0.8,
      resultType:   'dessert-sensor',
      packId:       'test-pack',
    })),
    latestScore: MIN_SCORE_RATE,
    ...overrides,
  }
}

function makeSession(completed = true): QuizSession {
  return {
    questions:    [],
    currentIndex: 0,
    answers:      {},
    startedAt:    new Date(),
    completedAt:  completed ? new Date() : null,
    sessionType:  'normal',
    packId:       'test-pack',
  }
}

beforeEach(() => {
  localStorage.clear()
  // window.TossReview 초기화
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (window as any).TossReview
})

// ── recordReviewPrompt / getLastReviewPromptAt ───────────────────

describe('recordReviewPrompt', () => {
  it('현재 시각을 REVIEW_PROMPT_KEY에 저장한다', () => {
    recordReviewPrompt()
    const stored = localStorage.getItem(REVIEW_PROMPT_KEY)
    expect(stored).not.toBeNull()
    expect(() => new Date(stored!)).not.toThrow()
  })
})

describe('getLastReviewPromptAt', () => {
  it('저장된 값이 없으면 null을 반환한다', () => {
    expect(getLastReviewPromptAt()).toBeNull()
  })

  it('저장된 값이 있으면 반환한다', () => {
    const ts = new Date().toISOString()
    localStorage.setItem(REVIEW_PROMPT_KEY, ts)
    expect(getLastReviewPromptAt()).toBe(ts)
  })
})

// ── tryRequestReview — 조건 미충족 ──────────────────────────────

describe('tryRequestReview — 조건 미충족', () => {
  it('세션이 완주되지 않으면 recordReviewPrompt를 호출하지 않는다', () => {
    tryRequestReview(makeState(), makeSession(false))
    expect(localStorage.getItem(REVIEW_PROMPT_KEY)).toBeNull()
  })

  it('플레이 횟수 부족 시 호출하지 않는다', () => {
    tryRequestReview(makeState({ history: [] }), makeSession())
    expect(localStorage.getItem(REVIEW_PROMPT_KEY)).toBeNull()
  })

  it('최근 점수 70% 미만이면 호출하지 않는다', () => {
    tryRequestReview(makeState({ latestScore: 0.5 }), makeSession())
    expect(localStorage.getItem(REVIEW_PROMPT_KEY)).toBeNull()
  })

  it(`최근 ${COOLDOWN_DAYS}일 이내 요청이 있으면 호출하지 않는다`, () => {
    const recentPrompt = new Date(
      Date.now() - (COOLDOWN_DAYS - 1) * 24 * 60 * 60 * 1000,
    ).toISOString()
    localStorage.setItem(REVIEW_PROMPT_KEY, recentPrompt)
    const before = localStorage.getItem(REVIEW_PROMPT_KEY)
    tryRequestReview(makeState(), makeSession())
    // 값이 갱신되지 않아야 함 (여전히 이전 값)
    expect(localStorage.getItem(REVIEW_PROMPT_KEY)).toBe(before)
  })
})

// ── tryRequestReview — 조건 충족 ────────────────────────────────

describe('tryRequestReview — 조건 충족', () => {
  it('모든 조건 충족 시 REVIEW_PROMPT_KEY를 갱신한다', () => {
    tryRequestReview(makeState(), makeSession())
    expect(localStorage.getItem(REVIEW_PROMPT_KEY)).not.toBeNull()
  })

  it('TossReview.requestReview가 있으면 호출한다', () => {
    const requestReview = vi.fn()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(window as any).TossReview = { requestReview }
    tryRequestReview(makeState(), makeSession())
    expect(requestReview).toHaveBeenCalledTimes(1)
  })

  it('TossReview가 없는 환경(웹)에서도 오류 없이 동작한다', () => {
    expect(() => tryRequestReview(makeState(), makeSession())).not.toThrow()
  })
})

// ── requestReview 실패 fallback ──────────────────────────────────

describe('tryRequestReview — requestReview 실패 fallback', () => {
  it('TossReview.requestReview가 throw해도 UX 흐름이 깨지지 않는다', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(window as any).TossReview = {
      requestReview: vi.fn().mockImplementation(() => { throw new Error('API 오류') }),
    }
    // 예외가 밖으로 전파되지 않아야 함
    expect(() => tryRequestReview(makeState(), makeSession())).not.toThrow()
  })

  it('API 실패해도 recordReviewPrompt는 이미 기록된다', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(window as any).TossReview = {
      requestReview: vi.fn().mockImplementation(() => { throw new Error('API 오류') }),
    }
    tryRequestReview(makeState(), makeSession())
    // 실패 전에 이미 기록됐으므로 값이 존재해야 함
    expect(localStorage.getItem(REVIEW_PROMPT_KEY)).not.toBeNull()
  })
})
