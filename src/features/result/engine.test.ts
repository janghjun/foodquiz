import { describe, it, expect } from 'vitest'
import {
  calculateScore,
  calculateCategoryStats,
  calculateTrendProfile,
  inferResultType,
  buildQuizResult,
} from './engine'
import type { CategoryStats, TrendProfile } from './types'
import type { Question, QuizSession, QuestionCategory } from '../quiz/types'

// ── 테스트 헬퍼 ──────────────────────────────────────────────

function makeQuestion(id: string, category: QuestionCategory): Question {
  return {
    id,
    format: 'ox',
    category,
    prompt: `문제 ${id}`,
    choices: ['O', 'X'],
    answer: 'O',
    explanation: '설명.',
    evidenceLevel: 'A',
  }
}

function makeSession(
  categories: QuestionCategory[],
  correctIndices: Set<number>,
): QuizSession {
  const questions = categories.map((cat, i) => makeQuestion(`q${i + 1}`, cat))
  const answers: Record<string, string> = {}
  questions.forEach((q, i) => {
    answers[q.id] = correctIndices.has(i) ? 'O' : 'X'
  })
  return { questions, currentIndex: questions.length, answers, startedAt: new Date(), completedAt: new Date() }
}

// CategoryStats를 간결하게 생성: [correct, total], 미지정은 [0, 0]
function makeCategoryStats(
  values: Partial<Record<QuestionCategory, [number, number]>>,
): CategoryStats {
  const ALL: QuestionCategory[] = ['dessert_trend', 'snack_recall', 'convenience_dessert', 'solo_meal', 'wellness_food']
  return Object.fromEntries(
    ALL.map((cat) => {
      const [correct, total] = values[cat] ?? [0, 0]
      return [cat, { correct, total, rate: total > 0 ? correct / total : 0 }]
    }),
  ) as CategoryStats
}

const zeroTrend: TrendProfile = { modern: 0, recall: 0 }

// ── calculateScore ────────────────────────────────────────────

describe('calculateScore', () => {
  it('전체 정답 수와 비율을 계산한다', () => {
    const session = makeSession(
      ['dessert_trend', 'snack_recall', 'solo_meal', 'convenience_dessert', 'wellness_food'],
      new Set([0, 1, 2]), // 3/5 정답
    )
    const score = calculateScore(session)
    expect(score.correct).toBe(3)
    expect(score.total).toBe(5)
    expect(score.rate).toBeCloseTo(0.6)
  })

  it('전부 오답이면 rate 0', () => {
    const session = makeSession(['dessert_trend', 'snack_recall'], new Set())
    expect(calculateScore(session).rate).toBe(0)
  })

  it('문항이 없으면 rate 0 (division guard)', () => {
    const session = makeSession([], new Set())
    expect(calculateScore(session).rate).toBe(0)
  })
})

// ── calculateCategoryStats ────────────────────────────────────

describe('calculateCategoryStats', () => {
  it('카테고리별 정답 수와 적중률을 계산한다', () => {
    const session = makeSession(
      ['dessert_trend', 'dessert_trend', 'snack_recall'],
      new Set([0]), // dessert 첫 번째만 정답
    )
    const stats = calculateCategoryStats(session)
    expect(stats.dessert_trend).toEqual({ correct: 1, total: 2, rate: 0.5 })
    expect(stats.snack_recall).toEqual({ correct: 0, total: 1, rate: 0 })
    expect(stats.solo_meal).toEqual({ correct: 0, total: 0, rate: 0 })
  })

  it('문항이 없는 카테고리는 rate 0 (division guard)', () => {
    const session = makeSession(['dessert_trend'], new Set([0]))
    const stats = calculateCategoryStats(session)
    expect(stats.snack_recall.rate).toBe(0)
    expect(stats.snack_recall.total).toBe(0)
  })
})

// ── calculateTrendProfile ─────────────────────────────────────

describe('calculateTrendProfile', () => {
  it('최신형(dessert/convenience/wellness)과 회상형(snack/solo) hit rate를 분리한다', () => {
    const session = makeSession(
      ['dessert_trend', 'convenience_dessert', 'wellness_food', 'snack_recall', 'solo_meal'],
      new Set([0, 1, 2]), // 최신형 3개 모두 정답, 회상형 0개 정답
    )
    const profile = calculateTrendProfile(session)
    expect(profile.modern).toBeCloseTo(1.0)
    expect(profile.recall).toBeCloseTo(0)
  })

  it('최신형 문항이 없으면 modern 0', () => {
    const session = makeSession(['snack_recall', 'solo_meal'], new Set([0, 1]))
    expect(calculateTrendProfile(session).modern).toBe(0)
  })
})

// ── inferResultType ───────────────────────────────────────────

describe('inferResultType', () => {
  it('dessert_trend ≥ 0.6 → 디저트 감각파', () => {
    const stats = makeCategoryStats({ dessert_trend: [3, 3] })
    expect(inferResultType(stats, zeroTrend).id).toBe('dessert-sensor')
  })

  it('convenience_dessert ≥ 0.6 (dessert < 0.6) → 편의점 트렌드 추적자', () => {
    const stats = makeCategoryStats({ dessert_trend: [1, 3], convenience_dessert: [2, 2] })
    expect(inferResultType(stats, zeroTrend).id).toBe('convenience-tracker')
  })

  it('modern ≥ 0.6 (dessert/convenience < 0.6) → SNS 바이럴 포착형', () => {
    const stats = makeCategoryStats({ dessert_trend: [1, 3], convenience_dessert: [1, 3] })
    expect(inferResultType(stats, { modern: 0.7, recall: 0.1 }).id).toBe('sns-viral-catcher')
  })

  it('snack_recall ≥ 0.6 (앞 규칙 미충족) → 추억 간식 마스터', () => {
    const stats = makeCategoryStats({ snack_recall: [3, 3] })
    expect(inferResultType(stats, zeroTrend).id).toBe('snack-nostalgia-master')
  })

  it('solo_meal ≥ 0.6 (앞 규칙 미충족) → 한 그릇 생활형', () => {
    const stats = makeCategoryStats({ solo_meal: [2, 2] })
    expect(inferResultType(stats, zeroTrend).id).toBe('solo-lifestyle')
  })

  it('모든 규칙 미충족 → 최고 카테고리 기준 fallback', () => {
    // snack_recall이 유일하게 total > 0, rate 0.33
    const stats = makeCategoryStats({ snack_recall: [1, 3] })
    expect(inferResultType(stats, zeroTrend).id).toBe('snack-nostalgia-master')
  })

  it('전체 total 0 → final fallback (추억 간식 마스터)', () => {
    const stats = makeCategoryStats({})
    expect(inferResultType(stats, zeroTrend).id).toBe('snack-nostalgia-master')
  })
})

// ── buildQuizResult ───────────────────────────────────────────

describe('buildQuizResult', () => {
  it('세션에서 score·categoryStats·trendProfile·resultType을 모두 반환한다', () => {
    const session = makeSession(
      ['dessert_trend', 'dessert_trend', 'dessert_trend', 'snack_recall', 'solo_meal'],
      new Set([0, 1, 2]), // dessert 전부 정답
    )
    const result = buildQuizResult(session)

    expect(result.score.correct).toBe(3)
    expect(result.score.total).toBe(5)
    expect(result.categoryStats.dessert_trend.rate).toBe(1)
    expect(result.categoryStats.snack_recall.rate).toBe(0)
    expect(result.resultType.id).toBe('dessert-sensor')
  })

  it('결과 타입에 label과 description이 있다', () => {
    const session = makeSession(['solo_meal', 'solo_meal'], new Set([0, 1]))
    const { resultType } = buildQuizResult(session)
    expect(resultType.label).toBeTruthy()
    expect(resultType.description).toBeTruthy()
  })

  it('전부 오답이어도 유효한 resultType을 반환한다 (fallback 동작)', () => {
    const session = makeSession(
      ['dessert_trend', 'snack_recall', 'solo_meal', 'convenience_dessert', 'wellness_food'],
      new Set(), // 모두 오답
    )
    const result = buildQuizResult(session)
    expect(result.score.correct).toBe(0)
    expect(result.resultType).toBeTruthy()
    expect(result.resultType.label).toBeTruthy()
  })

  it('문항이 없는 세션도 에러 없이 동작한다 (division guard)', () => {
    const empty = makeSession([], new Set())
    const result = buildQuizResult(empty)
    expect(result.score.total).toBe(0)
    expect(result.score.rate).toBe(0)
    expect(result.resultType.label).toBeTruthy()
  })
})
