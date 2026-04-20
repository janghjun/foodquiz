export type { ResultType, ResultTypeId, ScoreResult, CategoryStat, CategoryStats, TrendProfile, QuizResult } from './types'
export { RESULT_TYPES } from './types'
export { calculateScore, calculateCategoryStats, calculateTrendProfile, inferResultType, buildQuizResult } from './engine'
