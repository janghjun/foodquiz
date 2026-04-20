import { useState } from 'react'
import HomePage from './pages/HomePage'
import QuizPage from './pages/QuizPage'
import ResultPage from './pages/ResultPage'
import type { QuizSession } from './features/quiz'
import { createReviewSession } from './features/quiz'

export type Screen = 'home' | 'quiz' | 'result'

const RESULT_KEY = 'gtm_result'

function loadSavedSession(): QuizSession | null {
  try {
    const raw = sessionStorage.getItem(RESULT_KEY)
    if (!raw) return null
    const p = JSON.parse(raw) as QuizSession & { startedAt: string; completedAt: string | null }
    return {
      ...p,
      startedAt: new Date(p.startedAt),
      completedAt: p.completedAt ? new Date(p.completedAt) : null,
    }
  } catch {
    return null
  }
}

export default function App() {
  const [completedSession, setCompletedSession] = useState<QuizSession | null>(loadSavedSession)
  const [reviewSession, setReviewSession] = useState<QuizSession | null>(null)
  const [screen, setScreen] = useState<Screen>(() => {
    try { return sessionStorage.getItem(RESULT_KEY) ? 'result' : 'home' } catch { return 'home' }
  })

  const handleFinish = (s: QuizSession) => {
    try { sessionStorage.setItem(RESULT_KEY, JSON.stringify(s)) } catch { /* noop */ }
    setCompletedSession(s)
    setReviewSession(null)
    setScreen('result')
  }

  const handleRestart = () => {
    try { sessionStorage.removeItem(RESULT_KEY) } catch { /* noop */ }
    setCompletedSession(null)
    setReviewSession(null)
    setScreen('home')
  }

  if (screen === 'quiz') {
    return (
      <QuizPage
        onFinish={handleFinish}
        initialSession={reviewSession ?? undefined}
        reviewLabel={reviewSession ? '오답 복습' : undefined}
      />
    )
  }

  if (screen === 'result' && completedSession) {
    const reviewable = createReviewSession(completedSession)
    return (
      <ResultPage
        session={completedSession}
        onRestart={handleRestart}
        onStartReview={reviewable ? () => {
          setReviewSession(reviewable)
          setScreen('quiz')
        } : undefined}
      />
    )
  }

  return <HomePage onStart={() => setScreen('quiz')} />
}
