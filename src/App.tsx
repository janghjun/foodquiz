import { useState } from 'react'
import HomePage from './pages/HomePage'
import QuizPage from './pages/QuizPage'
import ResultPage from './pages/ResultPage'
import type { QuizSession } from './features/quiz'
import { createQuizSession, createAdaptiveSession, createReviewSession, createDailySession } from './features/quiz'
import { mockPack } from './features/content'
import { loadUserQuizState } from './features/state/userQuizState'

export type Screen = 'home' | 'quiz' | 'result'

const RESULT_KEY = 'gtm_result'

function loadSavedSession(): QuizSession | null {
  try {
    const raw = sessionStorage.getItem(RESULT_KEY)
    if (!raw) return null
    const p = JSON.parse(raw) as QuizSession & { startedAt: string; completedAt: string | null }
    return {
      ...p,
      startedAt:   new Date(p.startedAt),
      completedAt: p.completedAt ? new Date(p.completedAt) : null,
    }
  } catch {
    return null
  }
}

export default function App() {
  const [completedSession, setCompletedSession] = useState<QuizSession | null>(loadSavedSession)
  const [pendingSession, setPendingSession]     = useState<QuizSession | null>(null)
  const [quizLabel, setQuizLabel]               = useState<string | undefined>(undefined)
  const [screen, setScreen] = useState<Screen>(() => {
    try { return sessionStorage.getItem(RESULT_KEY) ? 'result' : 'home' } catch { return 'home' }
  })

  const handleFinish = (s: QuizSession) => {
    try { sessionStorage.setItem(RESULT_KEY, JSON.stringify(s)) } catch { /* noop */ }
    setCompletedSession(s)
    setPendingSession(null)
    setQuizLabel(undefined)
    setScreen('result')
  }

  const handleRestart = () => {
    try { sessionStorage.removeItem(RESULT_KEY) } catch { /* noop */ }
    setCompletedSession(null)
    setPendingSession(null)
    setQuizLabel(undefined)
    setScreen('home')
  }

  const startWith = (session: QuizSession, label?: string) => {
    setPendingSession(session)
    setQuizLabel(label)
    setScreen('quiz')
  }

  const handleStart = () => {
    const state = loadUserQuizState()
    const hasProgress = Object.keys(state.progressByQuestionId).length >= 5
    const opts = { packId: mockPack.packId }
    const session = hasProgress
      ? createAdaptiveSession(mockPack.questions, state.progressByQuestionId, opts)
      : createQuizSession(mockPack.questions, opts)
    startWith(session)
  }

  if (screen === 'quiz') {
    return (
      <QuizPage
        onFinish={handleFinish}
        initialSession={pendingSession ?? undefined}
        quizLabel={quizLabel}
      />
    )
  }

  if (screen === 'result' && completedSession) {
    const reviewable = createReviewSession(completedSession)
    return (
      <ResultPage
        session={completedSession}
        onRestart={handleRestart}
        onStartReview={reviewable ? () => startWith(reviewable, '오답 복습') : undefined}
      />
    )
  }

  return (
    <HomePage
      onStart={handleStart}
      onStartDaily={() =>
        startWith(
          createDailySession(mockPack.questions, undefined, { packId: mockPack.packId }),
          '오늘의 퀴즈',
        )
      }
    />
  )
}
