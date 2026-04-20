import { describe, it, expect } from 'vitest'
import {
  createQuizSession,
  getCurrentQuestion,
  submitAnswer,
  goNext,
  isCompleted,
  isCorrect,
} from './engine'
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
