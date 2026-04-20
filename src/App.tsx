import { useState } from 'react'
import HomePage from './pages/HomePage'
import QuizPage from './pages/QuizPage'
import ResultPage from './pages/ResultPage'
import type { QuizSession } from './features/quiz'

export type Screen = 'home' | 'quiz' | 'result'

// 결과 화면만 복원 — 진행 중 퀴즈는 새로고침 시 홈으로 리셋 (의도된 동작)
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
  const [screen, setScreen] = useState<Screen>(() => {
    // loadSavedSession() 의 JSON.parse를 중복 호출하지 않도록 키 존재 여부만 확인
    try { return sessionStorage.getItem(RESULT_KEY) ? 'result' : 'home' } catch { return 'home' }
  })

  if (screen === 'quiz') {
    return (
      <QuizPage
        onFinish={(s) => {
          try { sessionStorage.setItem(RESULT_KEY, JSON.stringify(s)) } catch { /* noop */ }
          setCompletedSession(s)
          setScreen('result')
        }}
      />
    )
  }

  if (screen === 'result' && completedSession) {
    return (
      <ResultPage
        session={completedSession}
        onRestart={() => {
          try { sessionStorage.removeItem(RESULT_KEY) } catch { /* noop */ }
          setCompletedSession(null)
          setScreen('home')
        }}
      />
    )
  }

  return <HomePage onStart={() => setScreen('quiz')} />
}
