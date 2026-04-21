import type { Question, QuizSession } from './types'
import type { SessionOptions } from './engine'

export const MIN_CATEGORY_QUESTIONS = 3
const SESSION_SIZE = 10

export interface CategoryDef {
  key: string
  label: string
  questionCategory: string
}

export const CATEGORIES: CategoryDef[] = [
  { key: 'dessert',     label: '디저트',    questionCategory: 'dessert_trend'       },
  { key: 'snack',       label: '추억 간식', questionCategory: 'snack_recall'        },
  { key: 'convenience', label: '편의점',    questionCategory: 'convenience_dessert' },
  { key: 'meal',        label: '한 끼',     questionCategory: 'solo_meal'           },
  { key: 'wellness',    label: '건강식',    questionCategory: 'wellness_food'       },
]

export function getCategoryLabel(key: string): string {
  return CATEGORIES.find((c) => c.key === key)?.label ?? key
}

function shuffle<T>(arr: T[]): T[] {
  const result = [...arr]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

/**
 * 지정 카테고리 문제만 추출해 세션을 생성합니다.
 * 해당 카테고리 문제가 MIN_CATEGORY_QUESTIONS 미만이면 다른 카테고리 문제로 보충합니다.
 */
export function createCategorySession(
  allQuestions: Question[],
  categoryKey: string,
  options: SessionOptions = {},
): QuizSession {
  const catDef = CATEGORIES.find((c) => c.key === categoryKey)
  const filtered = catDef
    ? allQuestions.filter((q) => q.category === catDef.questionCategory)
    : allQuestions

  let pool: Question[]
  if (filtered.length >= MIN_CATEGORY_QUESTIONS) {
    pool = shuffle(filtered).slice(0, SESSION_SIZE)
  } else {
    // fallback: 부족분을 다른 카테고리 문제로 보충
    const extra = shuffle(
      allQuestions.filter((q) => !filtered.includes(q)),
    ).slice(0, SESSION_SIZE - filtered.length)
    pool = shuffle([...filtered, ...extra]).slice(0, SESSION_SIZE)
  }

  return {
    questions:    pool,
    currentIndex: 0,
    answers:      {},
    startedAt:    new Date(),
    completedAt:  null,
    sessionType:  'category',
    packId:       options.packId,
    categoryKey,
  }
}
