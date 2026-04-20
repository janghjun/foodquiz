import type { QuizSession, QuestionCategory } from '../quiz/types'
import type {
  ScoreResult, CategoryStats, CategoryStat, TrendProfile, QuizResult, ResultTypeId, ResultType,
} from './types'
import { RESULT_TYPES } from './types'

export function calculateScore(session: QuizSession): ScoreResult {
  const total = session.questions.length
  const correct = session.questions.filter((q) => session.answers[q.id] === q.answer).length
  return { correct, total, rate: total > 0 ? correct / total : 0 }
}

export function calculateCategoryStats(session: QuizSession): CategoryStats {
  const stats: CategoryStats = {
    dessert_trend:       { correct: 0, total: 0, rate: 0 },
    snack_recall:        { correct: 0, total: 0, rate: 0 },
    convenience_dessert: { correct: 0, total: 0, rate: 0 },
    solo_meal:           { correct: 0, total: 0, rate: 0 },
    wellness_food:       { correct: 0, total: 0, rate: 0 },
  }

  for (const q of session.questions) {
    const s = stats[q.category]
    s.total++
    if (session.answers[q.id] === q.answer) s.correct++
  }

  for (const s of Object.values(stats) as CategoryStat[]) {
    s.rate = s.total > 0 ? s.correct / s.total : 0
  }

  return stats
}

const MODERN_CATEGORIES: QuestionCategory[] = ['dessert_trend', 'convenience_dessert', 'wellness_food']
const RECALL_CATEGORIES: QuestionCategory[] = ['snack_recall', 'solo_meal']

export function calculateTrendProfile(session: QuizSession): TrendProfile {
  return {
    modern: categoryHitRate(session, MODERN_CATEGORIES),
    recall: categoryHitRate(session, RECALL_CATEGORIES),
  }
}

// 우선순위 순서로 나열 — 위에서부터 첫 번째 충족 규칙의 타입이 결과
const TYPE_RULES: Array<{
  id: ResultTypeId
  match: (c: CategoryStats, t: TrendProfile) => boolean
}> = [
  { id: 'dessert-sensor',         match: (c)    => c.dessert_trend.rate >= 0.6 },
  { id: 'convenience-tracker',    match: (c)    => c.convenience_dessert.rate >= 0.6 },
  { id: 'sns-viral-catcher',      match: (_, t) => t.modern >= 0.6 },
  { id: 'snack-nostalgia-master', match: (c)    => c.snack_recall.rate >= 0.6 },
  { id: 'solo-lifestyle',         match: (c)    => c.solo_meal.rate >= 0.6 },
]

const CATEGORY_TO_TYPE: Record<QuestionCategory, ResultTypeId> = {
  dessert_trend:       'dessert-sensor',
  convenience_dessert: 'convenience-tracker',
  wellness_food:       'sns-viral-catcher',
  snack_recall:        'snack-nostalgia-master',
  solo_meal:           'solo-lifestyle',
}

const FALLBACK_ID: ResultTypeId = 'snack-nostalgia-master'

export function inferResultType(
  categoryStats: CategoryStats,
  trendProfile: TrendProfile,
): ResultType {
  const matched = TYPE_RULES.find(({ match }) => match(categoryStats, trendProfile))
  if (matched) return RESULT_TYPES[matched.id]

  // fallback: 문항이 있는 카테고리 중 적중률이 가장 높은 타입
  const best = (Object.entries(categoryStats) as [QuestionCategory, CategoryStat][])
    .filter(([, s]) => s.total > 0)
    .sort(([, a], [, b]) => b.rate - a.rate)[0]

  return RESULT_TYPES[best ? CATEGORY_TO_TYPE[best[0]] : FALLBACK_ID]
}

export function buildQuizResult(session: QuizSession): QuizResult {
  const score = calculateScore(session)
  const categoryStats = calculateCategoryStats(session)
  const trendProfile = calculateTrendProfile(session)
  const resultType = inferResultType(categoryStats, trendProfile)
  return { score, categoryStats, trendProfile, resultType }
}

function categoryHitRate(session: QuizSession, categories: QuestionCategory[]): number {
  const qs = session.questions.filter((q) => categories.includes(q.category))
  if (qs.length === 0) return 0
  return qs.filter((q) => session.answers[q.id] === q.answer).length / qs.length
}
