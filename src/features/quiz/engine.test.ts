import { describe, it, expect } from 'vitest'
import {
  createQuizSession,
  createAdaptiveSession,
  getCurrentQuestion,
  submitAnswer,
  goNext,
  isCompleted,
  isCorrect,
  createReviewSession,
} from './engine'
import type { QuestionProgress } from '../state/userQuizState'
import type { Question } from './types'

function makeQuestion(id: string, answer: string): Question {
  return {
    id,
    format: 'ox',
    category: 'snack_recall',
    prompt: `문제 ${id}`,
    choices: ['O', 'X'],
    answer,
    explanation: '설명.',
    evidenceLevel: 'A',
  }
}

const questions: Question[] = Array.from({ length: 12 }, (_, i) =>
  makeQuestion(`q${i + 1}`, i % 2 === 0 ? 'O' : 'X'),
)

describe('createQuizSession', () => {
  it('팩이 12개여도 세션은 10문항으로 제한된다', () => {
    const session = createQuizSession(questions)
    expect(session.questions).toHaveLength(10)
  })

  it('startedAt이 기록된다', () => {
    const before = new Date()
    const session = createQuizSession(questions)
    expect(session.startedAt.getTime()).toBeGreaterThanOrEqual(before.getTime())
  })

  it('completedAt은 null로 시작한다', () => {
    const session = createQuizSession(questions)
    expect(session.completedAt).toBeNull()
  })

  it('팩이 5개뿐이면 5문항 세션이 만들어진다', () => {
    const session = createQuizSession(questions.slice(0, 5))
    expect(session.questions).toHaveLength(5)
  })
})

describe('getCurrentQuestion', () => {
  it('첫 문항을 반환한다', () => {
    const session = createQuizSession(questions)
    const first = getCurrentQuestion(session)
    expect(first).not.toBeNull()
    expect(questions.some((q) => q.id === first?.id)).toBe(true)
  })

  it('완료된 세션에서는 null을 반환한다', () => {
    let session = createQuizSession(questions.slice(0, 1))
    session = submitAnswer(session, 'O')
    session = goNext(session)
    expect(getCurrentQuestion(session)).toBeNull()
  })
})

describe('submitAnswer', () => {
  it('답안이 저장된다', () => {
    let session = createQuizSession(questions)
    const firstQ = getCurrentQuestion(session)!
    session = submitAnswer(session, 'O')
    expect(session.answers[firstQ.id]).toBe('O')
  })

  it('같은 문항에 두 번 답하면 첫 번째 답이 유지된다', () => {
    let session = createQuizSession(questions)
    const firstQ = getCurrentQuestion(session)!
    session = submitAnswer(session, 'O')
    session = submitAnswer(session, 'X')
    expect(session.answers[firstQ.id]).toBe('O')
  })

  it('완료된 세션에 답해도 세션이 변하지 않는다', () => {
    let session = createQuizSession(questions.slice(0, 1))
    session = submitAnswer(session, 'O')
    session = goNext(session)
    const after = submitAnswer(session, 'X')
    expect(after).toBe(session) // 동일 참조
  })
})

describe('goNext', () => {
  it('currentIndex가 1 증가한다', () => {
    let session = createQuizSession(questions)
    session = goNext(session)
    expect(session.currentIndex).toBe(1)
  })

  it('마지막 문항 이후 goNext를 호출하면 completedAt이 기록된다', () => {
    let session = createQuizSession(questions.slice(0, 1))
    session = goNext(session)
    expect(session.completedAt).not.toBeNull()
  })

  it('완료 이후 goNext를 여러 번 호출해도 currentIndex가 범위를 넘지 않는다', () => {
    let session = createQuizSession(questions.slice(0, 1))
    session = goNext(session)
    session = goNext(session)
    session = goNext(session)
    expect(session.currentIndex).toBe(1) // questions.length와 동일
  })

  it('완료 이후 goNext를 다시 호출해도 completedAt이 덮어써지지 않는다', () => {
    let session = createQuizSession(questions.slice(0, 1))
    session = goNext(session)
    const firstCompletedAt = session.completedAt
    session = goNext(session)
    expect(session.completedAt).toBe(firstCompletedAt) // 동일 참조
  })
})

describe('isCompleted', () => {
  it('시작 직후는 false', () => {
    expect(isCompleted(createQuizSession(questions))).toBe(false)
  })

  it('마지막 goNext 이후는 true', () => {
    let session = createQuizSession(questions.slice(0, 1))
    session = goNext(session)
    expect(isCompleted(session)).toBe(true)
  })
})

describe('full walkthrough', () => {
  it('10문항 전체를 답하고 완료 상태에 도달한다', () => {
    let session = createQuizSession(questions)
    expect(session.questions).toHaveLength(10)

    for (let i = 0; i < 10; i++) {
      const q = getCurrentQuestion(session)
      expect(q).not.toBeNull()
      session = submitAnswer(session, q!.answer)
      session = goNext(session)
    }

    expect(isCompleted(session)).toBe(true)
    expect(getCurrentQuestion(session)).toBeNull()
    const correctCount = session.questions.filter(
      (q) => session.answers[q.id] === q.answer,
    ).length
    expect(correctCount).toBe(10)
  })
})

describe('isCorrect', () => {
  it('미답 문항은 null을 반환한다', () => {
    const session = createQuizSession(questions)
    const firstQ = getCurrentQuestion(session)!
    expect(isCorrect(session, firstQ.id)).toBeNull()
  })

  it('정답이면 true를 반환한다', () => {
    let session = createQuizSession(questions)
    const firstQ = getCurrentQuestion(session)!
    session = submitAnswer(session, firstQ.answer)
    expect(isCorrect(session, firstQ.id)).toBe(true)
  })

  it('오답이면 false를 반환한다', () => {
    let session = createQuizSession(questions)
    const firstQ = getCurrentQuestion(session)!
    const wrongAnswer = firstQ.answer === 'O' ? 'X' : 'O'
    session = submitAnswer(session, wrongAnswer)
    expect(isCorrect(session, firstQ.id)).toBe(false)
  })

  it('존재하지 않는 questionId는 null을 반환한다', () => {
    const session = createQuizSession(questions)
    expect(isCorrect(session, 'nonexistent')).toBeNull()
  })
})

// ── createReviewSession ───────────────────────────────────────
describe('createReviewSession', () => {
  function makeCompletedWithMix(): ReturnType<typeof createQuizSession> {
    // q1~q4 로 구성된 세션: 짝수 index → 정답 'O', 홀수 → 정답 'X'
    const qs = [
      makeQuestion('q1', 'O'),
      makeQuestion('q2', 'X'),
      makeQuestion('q3', 'O'),
      makeQuestion('q4', 'X'),
    ]
    let s = { questions: qs, currentIndex: 0, answers: {} as Record<string, string>, startedAt: new Date(), completedAt: null as Date | null }
    // q1 정답, q2 오답, q3 오답, q4 정답
    s = submitAnswer(s, 'O')  // q1 correct
    s = goNext(s)
    s = submitAnswer(s, 'O')  // q2 wrong (answer is X)
    s = goNext(s)
    s = submitAnswer(s, 'X')  // q3 wrong (answer is O)
    s = goNext(s)
    s = submitAnswer(s, 'X')  // q4 correct
    s = goNext(s)
    return s
  }

  it('오답 문항만 포함한 세션을 생성한다', () => {
    const completed = makeCompletedWithMix()
    const review = createReviewSession(completed)
    expect(review).not.toBeNull()
    expect(review!.questions).toHaveLength(2)
    const ids = review!.questions.map((q) => q.id)
    expect(ids).toContain('q2')
    expect(ids).toContain('q3')
  })

  it('재도전 세션은 answers가 비어있다', () => {
    const completed = makeCompletedWithMix()
    const review = createReviewSession(completed)
    expect(review!.answers).toEqual({})
    expect(review!.completedAt).toBeNull()
  })

  it('오답이 없으면 null을 반환한다', () => {
    const qs = [makeQuestion('q1', 'O'), makeQuestion('q2', 'X')]
    let s = { questions: qs, currentIndex: 0, answers: {} as Record<string, string>, startedAt: new Date(), completedAt: null as Date | null }
    s = submitAnswer(s, 'O'); s = goNext(s)
    s = submitAnswer(s, 'X'); s = goNext(s)
    expect(createReviewSession(s)).toBeNull()
  })

  it('category 옵션으로 필터링된 세션을 생성한다', () => {
    const qs: Question[] = [
      { ...makeQuestion('q1', 'O'), category: 'snack_recall' },
      { ...makeQuestion('q2', 'O'), category: 'dessert_trend' },
    ]
    let s = { questions: qs, currentIndex: 0, answers: {} as Record<string, string>, startedAt: new Date(), completedAt: null as Date | null }
    s = submitAnswer(s, 'X'); s = goNext(s)  // q1 wrong
    s = submitAnswer(s, 'X'); s = goNext(s)  // q2 wrong
    const review = createReviewSession(s, { category: 'snack_recall' })
    expect(review!.questions).toHaveLength(1)
    expect(review!.questions[0].id).toBe('q1')
  })

  it('원본 세션을 변경하지 않는다', () => {
    const completed = makeCompletedWithMix()
    const originalAnswers = { ...completed.answers }
    createReviewSession(completed)
    expect(completed.answers).toEqual(originalAnswers)
    expect(completed.questions).toHaveLength(4)
  })

  it('packId가 원본 세션에서 계승된다', () => {
    const completed = { ...makeCompletedWithMix(), packId: 'my-pack' }
    const review = createReviewSession(completed)
    expect(review?.packId).toBe('my-pack')
  })
})

// ── createAdaptiveSession ─────────────────────────────────────
describe('createAdaptiveSession', () => {
  const pool: Question[] = Array.from({ length: 15 }, (_, i) =>
    makeQuestion(`qa${i + 1}`, i % 2 === 0 ? 'O' : 'X'),
  )

  function makeProgress(id: string, wrong: number, total: number): QuestionProgress {
    return {
      questionId: id, lastPlayedAt: new Date().toISOString(),
      lastMode: 'normal', lastPackId: 'p', lastResult: wrong > 0 ? 'wrong' : 'correct',
      attemptCount: total, correctCount: total - wrong, wrongCount: wrong,
    }
  }

  it('10문항을 선택한다', () => {
    const session = createAdaptiveSession(pool, {})
    expect(session.questions).toHaveLength(10)
  })

  it('문항 수가 10개 미만이면 전부 포함한다', () => {
    const session = createAdaptiveSession(pool.slice(0, 5), {})
    expect(session.questions).toHaveLength(5)
  })

  it('중복 문항이 없다', () => {
    const session = createAdaptiveSession(pool, {})
    const ids = session.questions.map((q) => q.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('packId가 options에서 전달된다', () => {
    const session = createAdaptiveSession(pool, {}, { packId: 'test-pack' })
    expect(session.packId).toBe('test-pack')
  })

  it('자주 틀린 문항이 포함되는 경향이 있다 (통계적 확인)', () => {
    // qa1을 100% 오답으로 설정 → 여러 번 실행 시 반드시 포함돼야 할 만큼 높은 가중치
    const progress: Record<string, QuestionProgress> = {
      qa1: makeProgress('qa1', 10, 10),  // 100% 오답
    }
    let includedCount = 0
    for (let i = 0; i < 20; i++) {
      const s = createAdaptiveSession(pool, progress)
      if (s.questions.some((q) => q.id === 'qa1')) includedCount++
    }
    // 가중치 3.0 vs 평균 1.2 → 2.5배 확률. 20회 중 최소 15회 포함 기대
    expect(includedCount).toBeGreaterThanOrEqual(15)
  })
})
