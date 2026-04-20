import type { QuestionCategory } from '../quiz/types'

export type ResultTypeId =
  | 'dessert-sensor'
  | 'convenience-tracker'
  | 'sns-viral-catcher'
  | 'snack-nostalgia-master'
  | 'solo-lifestyle'

export interface ResultType {
  id: ResultTypeId
  label: string
  description: string
}

export const RESULT_TYPES: Record<ResultTypeId, ResultType> = {
  'dessert-sensor': {
    id: 'dessert-sensor',
    label: '디저트 감각파',
    description: '유행 디저트라면 누구보다 빠르게 포착하는 트렌드 촉수를 가지고 있어요.',
  },
  'convenience-tracker': {
    id: 'convenience-tracker',
    label: '편의점 트렌드 추적자',
    description: '편의점 신상이 뜨면 이미 알고 있는, 생활 밀착형 트렌드 탐험가예요.',
  },
  'sns-viral-catcher': {
    id: 'sns-viral-catcher',
    label: 'SNS 바이럴 포착형',
    description: 'SNS에서 화제가 된 음식이라면 금방 귀에 들어오는 바이럴 감지기예요.',
  },
  'snack-nostalgia-master': {
    id: 'snack-nostalgia-master',
    label: '추억 간식 마스터',
    description: '그 시절 유행했던 간식이라면 추억과 함께 정확하게 기억하고 있어요.',
  },
  'solo-lifestyle': {
    id: 'solo-lifestyle',
    label: '한 그릇 생활형',
    description: '혼자만의 한 끼를 소중히 여기는, 실속 있는 식문화 생활자예요.',
  },
}

export interface ScoreResult {
  correct: number
  total: number
  rate: number // 0~1
}

export interface CategoryStat {
  correct: number
  total: number
  rate: number // 0~1
}

export type CategoryStats = Record<QuestionCategory, CategoryStat>

export interface TrendProfile {
  modern: number // 최신형 hit rate: dessert_trend, convenience_dessert, wellness_food
  recall: number // 회상형 hit rate: snack_recall, solo_meal
}

export interface QuizResult {
  score: ScoreResult
  categoryStats: CategoryStats
  trendProfile: TrendProfile
  resultType: ResultType
}
