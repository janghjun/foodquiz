import type { QuestionProgress } from '../state/userQuizState'
import type { Question, QuizSession } from '../quiz/types'

/**
 * progressByQuestionId 기준으로 lastResult === 'wrong' 인 문항만 반환.
 * 세션 모드에 관계없이 가장 최근 풀이 결과가 wrong이면 포함.
 */
export function getWrongNoteQuestions(
  progress: Record<string, QuestionProgress>,
  allQuestions: Question[],
): Question[] {
  return allQuestions.filter((q) => progress[q.id]?.lastResult === 'wrong')
}

/**
 * 오답 노트 기반 복습 세션 생성 (순수 함수).
 * allQuestions 없이 wrongQuestions만 바로 넘기세요.
 * 문항 없으면 null 반환.
 */
export function createWrongNoteSession(
  wrongQuestions: Question[],
  packId?: string,
): QuizSession | null {
  if (wrongQuestions.length === 0) return null

  const shuffled = [...wrongQuestions]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }

  return {
    questions:    shuffled,
    currentIndex: 0,
    answers:      {},
    startedAt:    new Date(),
    completedAt:  null,
    sessionType:  'wrong-only',
    packId,
  }
}
