import { describe, it, expect } from 'vitest'
import { getWrongNoteQuestions, createWrongNoteSession } from './reviewSelectors'
import { applySessionResult, defaultUserQuizState } from '../state/userQuizState'
import type { QuestionProgress } from '../state/userQuizState'
import type { Question, QuizSession } from '../quiz/types'
import type { QuizResult } from '../result/types'

// ── 픽스처 ───────────────────────────────────────────────────

function makeQ(id: string, category = 'snack_recall'): Question {
  return {
    id, format: 'ox', category: category as Question['category'],
    prompt: `문제 ${id}`, choices: ['O', 'X'], answer: 'O',
    explanation: '설명', evidenceLevel: 'A',
  }
}

function makeResult(rate = 0.5): QuizResult {
  return {
    score: { correct: 1, total: 2, rate },
    categoryStats: {
      dessert_trend: { correct: 0, total: 0, rate: 0 },
      snack_recall: { correct: 1, total: 2, rate: 0.5 },
      convenience_dessert: { correct: 0, total: 0, rate: 0 },
      solo_meal: { correct: 0, total: 0, rate: 0 },
      wellness_food: { correct: 0, total: 0, rate: 0 },
    },
    trendProfile: { modern: 0, recall: 0.5 },
    resultType: { id: 'snack-nostalgia-master', label: '추억 간식 마스터', description: '-' },
  }
}

function makeSession(
  questions: Question[],
  answers: Record<string, string>,
  sessionType: QuizSession['sessionType'] = 'normal',
): QuizSession {
  return {
    questions, answers,
    currentIndex: questions.length,
    startedAt: new Date(), completedAt: new Date(),
    sessionType,
  }
}

// ── getWrongNoteQuestions ────────────────────────────────────

describe('getWrongNoteQuestions', () => {
  it('lastResult === wrong 인 문항만 반환한다', () => {
    const q1 = makeQ('q1'); const q2 = makeQ('q2')
    const progress: Record<string, QuestionProgress> = {
      q1: { questionId: 'q1', lastPlayedAt: '', lastMode: 'normal', lastPackId: 'p',
             lastResult: 'wrong', attemptCount: 1, correctCount: 0, wrongCount: 1 },
      q2: { questionId: 'q2', lastPlayedAt: '', lastMode: 'normal', lastPackId: 'p',
             lastResult: 'correct', attemptCount: 1, correctCount: 1, wrongCount: 0 },
    }
    const result = getWrongNoteQuestions(progress, [q1, q2])
    expect(result.map(q => q.id)).toEqual(['q1'])
  })

  it('틀렸다가 나중에 맞히면 제거된다 (lastResult 갱신 반영)', () => {
    const q1 = makeQ('q1')
    let state = defaultUserQuizState()
    // 세션 A: q1 오답
    state = applySessionResult(state, makeSession([q1], { q1: 'X' }), makeResult(), 'p')
    expect(getWrongNoteQuestions(state.progressByQuestionId, [q1])).toHaveLength(1)

    // 세션 B: q1 정답
    state = applySessionResult(state, makeSession([q1], { q1: 'O' }), makeResult(), 'p')
    expect(getWrongNoteQuestions(state.progressByQuestionId, [q1])).toHaveLength(0)
  })

  it('daily 세션에서 틀리고 normal 세션에서 맞혀도 제거된다', () => {
    const q1 = makeQ('q1')
    let state = defaultUserQuizState()

    // daily에서 오답
    state = applySessionResult(state, makeSession([q1], { q1: 'X' }, 'daily'), makeResult(), 'p')
    expect(getWrongNoteQuestions(state.progressByQuestionId, [q1])).toHaveLength(1)

    // normal에서 정답
    state = applySessionResult(state, makeSession([q1], { q1: 'O' }, 'normal'), makeResult(), 'p')
    expect(getWrongNoteQuestions(state.progressByQuestionId, [q1])).toHaveLength(0)
  })

  it('wrong-only 세션 이후 상태가 올바르게 갱신된다', () => {
    const q1 = makeQ('q1'); const q2 = makeQ('q2')
    let state = defaultUserQuizState()

    // 일반 세션: q1 오답, q2 정답
    state = applySessionResult(state, makeSession([q1, q2], { q1: 'X', q2: 'O' }), makeResult(), 'p')
    expect(getWrongNoteQuestions(state.progressByQuestionId, [q1, q2])).toHaveLength(1)

    // wrong-only 세션에서 q1 정답
    state = applySessionResult(state, makeSession([q1], { q1: 'O' }, 'wrong-only'), makeResult(), 'p')
    expect(getWrongNoteQuestions(state.progressByQuestionId, [q1, q2])).toHaveLength(0)
  })

  it('한 번도 풀지 않은 문항은 포함되지 않는다', () => {
    const q1 = makeQ('q1')
    expect(getWrongNoteQuestions({}, [q1])).toHaveLength(0)
  })

  it('skipped 문항은 포함되지 않는다', () => {
    const q1 = makeQ('q1')
    const progress: Record<string, QuestionProgress> = {
      q1: { questionId: 'q1', lastPlayedAt: '', lastMode: 'normal', lastPackId: 'p',
             lastResult: 'skipped', attemptCount: 1, correctCount: 0, wrongCount: 0 },
    }
    expect(getWrongNoteQuestions(progress, [q1])).toHaveLength(0)
  })
})

// ── createWrongNoteSession ───────────────────────────────────

describe('createWrongNoteSession', () => {
  it('오답 문항 없으면 null 반환 (fallback)', () => {
    expect(createWrongNoteSession([], 'p')).toBeNull()
  })

  it('문항이 있으면 세션을 반환한다', () => {
    const session = createWrongNoteSession([makeQ('q1'), makeQ('q2')], 'p')
    expect(session).not.toBeNull()
    expect(session!.questions).toHaveLength(2)
    expect(session!.sessionType).toBe('wrong-only')
  })

  it('packId가 세션에 포함된다', () => {
    const session = createWrongNoteSession([makeQ('q1')], 'my-pack')
    expect(session!.packId).toBe('my-pack')
  })

  it('중복 문항이 없다', () => {
    const questions = Array.from({ length: 5 }, (_, i) => makeQ(`q${i}`))
    const session = createWrongNoteSession(questions)
    const ids = session!.questions.map(q => q.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
