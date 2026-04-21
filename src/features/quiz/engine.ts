import type { Question, QuestionCategory, QuizSession } from './types'
import type { QuestionProgress } from '../state/userQuizState'

const SESSION_SIZE = 10

export interface SessionOptions {
  packId?: string
}

// ── 기본 세션 ─────────────────────────────────────────────────

export function createQuizSession(questions: Question[], options: SessionOptions = {}): QuizSession {
  const shuffled = [...questions]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return {
    questions:    shuffled.slice(0, SESSION_SIZE),
    currentIndex: 0,
    answers:      {},
    startedAt:    new Date(),
    completedAt:  null,
    sessionType:  'normal',
    packId:       options.packId,
  }
}

// ── adaptive 세션 ──────────────────────────────────────────────

/** 자주 틀린 문항일수록 높은 가중치를 부여한다. */
function computeWeight(q: Question, progress: Record<string, QuestionProgress>): number {
  const p = progress[q.id]
  if (!p || p.attemptCount === 0) return 1.2           // 미경험: 중간 우선순위
  const wrongRate = p.wrongCount / p.attemptCount
  return 0.5 + wrongRate * 2.5                         // 0.5 (항상 정답) ~ 3.0 (항상 오답)
}

/** 가중치 기반 비복원 추출 */
function weightedSample(questions: Question[], weights: number[], count: number): Question[] {
  const pool = questions.map((q, i) => ({ q, w: weights[i] }))
  const result: Question[] = []

  while (result.length < count && pool.length > 0) {
    const total = pool.reduce((s, x) => s + x.w, 0)
    let rng = Math.random() * total
    let idx = pool.length - 1
    for (let i = 0; i < pool.length; i++) {
      rng -= pool[i].w
      if (rng <= 0) { idx = i; break }
    }
    result.push(pool[idx].q)
    pool.splice(idx, 1)
  }
  return result
}

/**
 * progressByQuestionId를 기반으로 자주 틀린 문제를 우선 선택.
 * 플레이 기록이 없는 문항은 중간 우선순위.
 */
export function createAdaptiveSession(
  questions: Question[],
  progress: Record<string, QuestionProgress>,
  options: SessionOptions = {},
): QuizSession {
  const weights = questions.map((q) => computeWeight(q, progress))
  const selected = weightedSample(questions, weights, Math.min(SESSION_SIZE, questions.length))

  return {
    questions:    selected,
    currentIndex: 0,
    answers:      {},
    startedAt:    new Date(),
    completedAt:  null,
    sessionType:  'normal',
    packId:       options.packId,
  }
}

// ── 세션 조작 ──────────────────────────────────────────────────

export function getCurrentQuestion(session: QuizSession): Question | null {
  if (session.currentIndex >= session.questions.length) return null
  return session.questions[session.currentIndex]
}

// 이미 답한 문항은 재선택 불가 — 동일 세션 객체 반환
export function submitAnswer(session: QuizSession, answer: string): QuizSession {
  const current = getCurrentQuestion(session)
  if (current === null) return session
  if (session.answers[current.id] !== undefined) return session
  return {
    ...session,
    answers: { ...session.answers, [current.id]: answer },
  }
}

// 미답 상태에서도 goNext 허용 — 답 강제는 UI 책임
export function goNext(session: QuizSession): QuizSession {
  const next = Math.min(session.currentIndex + 1, session.questions.length)
  const justFinished = next >= session.questions.length && session.completedAt === null
  return {
    ...session,
    currentIndex: next,
    completedAt: justFinished ? new Date() : session.completedAt,
  }
}

export function isCompleted(session: QuizSession): boolean {
  return session.completedAt !== null
}

// 미답이면 null, 정답이면 true, 오답이면 false
export function isCorrect(session: QuizSession, questionId: string): boolean | null {
  const submitted = session.answers[questionId]
  if (submitted === undefined) return null
  const question = session.questions.find((q) => q.id === questionId)
  if (question === undefined) return null
  return question.answer === submitted
}

// ── 오답 복습 세션 ─────────────────────────────────────────────

export interface ReviewSessionOptions {
  category?: QuestionCategory
}

/**
 * 완료된 세션에서 오답만 추출해 재도전 세션 생성.
 * 오답이 없으면 null 반환.
 */
export function createReviewSession(
  completed: QuizSession,
  options: ReviewSessionOptions = {},
): QuizSession | null {
  let wrongs = completed.questions.filter(
    (q) => completed.answers[q.id] !== undefined && completed.answers[q.id] !== q.answer,
  )

  if (options.category) {
    wrongs = wrongs.filter((q) => q.category === options.category)
  }

  if (wrongs.length === 0) return null

  const shuffled = [...wrongs]
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
    sessionType:  'review',
    packId:       completed.packId,   // 원본 팩 ID 계승
  }
}
