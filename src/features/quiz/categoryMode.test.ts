import { describe, it, expect } from 'vitest'
import { createCategorySession, getCategoryLabel, CATEGORIES, MIN_CATEGORY_QUESTIONS } from './categoryMode'
import { applySessionResult, defaultUserQuizState } from '../state/userQuizState'
import type { Question } from './types'
import type { QuizResult } from '../result/types'

// ── 픽스처 ───────────────────────────────────────────────────────

function makeQ(id: string, category: Question['category']): Question {
  return {
    id, format: 'ox', category,
    prompt: `문제 ${id}`, choices: ['O', 'X'], answer: 'O',
    explanation: '설명', evidenceLevel: 'A',
  }
}

function makeResult(): QuizResult {
  return {
    score: { correct: 1, total: 2, rate: 0.5 },
    categoryStats: {
      dessert_trend:       { correct: 0, total: 0, rate: 0 },
      snack_recall:        { correct: 1, total: 2, rate: 0.5 },
      convenience_dessert: { correct: 0, total: 0, rate: 0 },
      solo_meal:           { correct: 0, total: 0, rate: 0 },
      wellness_food:       { correct: 0, total: 0, rate: 0 },
    },
    trendProfile: { modern: 0, recall: 0.5 },
    resultType: { id: 'snack-nostalgia-master', label: '추억 간식 마스터', description: '-' },
  }
}

const ALL_QUESTIONS: Question[] = [
  ...Array.from({ length: 5 }, (_, i) => makeQ(`d${i}`, 'dessert_trend')),
  ...Array.from({ length: 5 }, (_, i) => makeQ(`s${i}`, 'snack_recall')),
  ...Array.from({ length: 5 }, (_, i) => makeQ(`c${i}`, 'convenience_dessert')),
  ...Array.from({ length: 5 }, (_, i) => makeQ(`m${i}`, 'solo_meal')),
  ...Array.from({ length: 5 }, (_, i) => makeQ(`w${i}`, 'wellness_food')),
]

// ── createCategorySession ────────────────────────────────────────

describe('createCategorySession', () => {
  it('지정 카테고리 문제만 출제된다', () => {
    const session = createCategorySession(ALL_QUESTIONS, 'dessert')
    expect(session.questions.every((q) => q.category === 'dessert_trend')).toBe(true)
  })

  it('sessionType이 category다', () => {
    const session = createCategorySession(ALL_QUESTIONS, 'snack')
    expect(session.sessionType).toBe('category')
  })

  it('categoryKey가 세션에 저장된다', () => {
    const session = createCategorySession(ALL_QUESTIONS, 'convenience')
    expect(session.categoryKey).toBe('convenience')
  })

  it('packId 옵션이 세션에 포함된다', () => {
    const session = createCategorySession(ALL_QUESTIONS, 'dessert', { packId: 'my-pack' })
    expect(session.packId).toBe('my-pack')
  })

  it('completedAt이 null로 초기화된다', () => {
    const session = createCategorySession(ALL_QUESTIONS, 'meal')
    expect(session.completedAt).toBeNull()
  })

  it('중복 문항이 없다', () => {
    const session = createCategorySession(ALL_QUESTIONS, 'dessert')
    const ids = session.questions.map((q) => q.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('최대 10문항을 넘지 않는다', () => {
    const many: Question[] = Array.from({ length: 20 }, (_, i) => makeQ(`d${i}`, 'dessert_trend'))
    const session = createCategorySession(many, 'dessert')
    expect(session.questions.length).toBeLessThanOrEqual(10)
  })

  it('문제 수가 부족하면 다른 카테고리 문제로 보충한다 (fallback)', () => {
    const few: Question[] = [
      makeQ('w0', 'wellness_food'),
      ...Array.from({ length: 10 }, (_, i) => makeQ(`d${i}`, 'dessert_trend')),
    ]
    const session = createCategorySession(few, 'wellness')
    expect(session.questions.length).toBeGreaterThanOrEqual(MIN_CATEGORY_QUESTIONS)
    expect(session.questions.some((q) => q.category !== 'wellness_food')).toBe(true)
  })

  it('fallback 세션도 categoryKey가 보존된다', () => {
    const few: Question[] = [
      makeQ('w0', 'wellness_food'),
      ...Array.from({ length: 5 }, (_, i) => makeQ(`d${i}`, 'dessert_trend')),
    ]
    const session = createCategorySession(few, 'wellness')
    expect(session.categoryKey).toBe('wellness')
    expect(session.sessionType).toBe('category')
  })

  it('알 수 없는 categoryKey는 전체 문제풀에서 추출한다', () => {
    const session = createCategorySession(ALL_QUESTIONS, 'unknown')
    expect(session.questions.length).toBeGreaterThan(0)
    expect(session.sessionType).toBe('category')
  })
})

// ── getCategoryLabel ─────────────────────────────────────────────

describe('getCategoryLabel', () => {
  it.each(CATEGORIES)('$key → $label', ({ key, label }) => {
    expect(getCategoryLabel(key)).toBe(label)
  })

  it('알 수 없는 key는 key를 그대로 반환한다', () => {
    expect(getCategoryLabel('unknown')).toBe('unknown')
  })
})

// ── history 저장 ─────────────────────────────────────────────────

describe('category 세션 history 저장', () => {
  it('sessionType category와 categoryKey가 history에 기록된다', () => {
    const session = createCategorySession(ALL_QUESTIONS, 'snack', { packId: 'test-pack' })
    const completedSession = {
      ...session,
      answers:     { [session.questions[0].id]: 'O' },
      completedAt: new Date(),
    }
    const state = applySessionResult(
      defaultUserQuizState(), completedSession, makeResult(), 'test-pack',
    )
    const record = state.history[0]
    expect(record.sessionType).toBe('category')
    expect(record.categoryKey).toBe('snack')
  })

  it('category 세션 이후 progressByQuestionId가 갱신된다', () => {
    const session = createCategorySession(ALL_QUESTIONS, 'dessert', { packId: 'test-pack' })
    const completedSession = {
      ...session,
      answers:     { [session.questions[0].id]: 'O' },
      completedAt: new Date(),
    }
    const state = applySessionResult(
      defaultUserQuizState(), completedSession, makeResult(), 'test-pack',
    )
    expect(state.progressByQuestionId[session.questions[0].id]).toBeDefined()
    expect(state.progressByQuestionId[session.questions[0].id].lastMode).toBe('category')
  })
})
