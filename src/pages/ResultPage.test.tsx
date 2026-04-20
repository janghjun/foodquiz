import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import ResultPage from './ResultPage'
import type { QuizSession } from '../features/quiz'
import { createQuizSession, submitAnswer, goNext } from '../features/quiz'
import { buildLocalPack } from '../features/content'

function makeCompletedSession(): QuizSession {
  const { questions } = buildLocalPack()
  let s = createQuizSession(questions)
  for (const q of s.questions) {
    s = submitAnswer(s, q.answer)
    s = goNext(s)
  }
  return s
}

describe('ResultPage smoke', () => {
  it('점수 문구와 다시하기 버튼을 렌더한다', () => {
    const session = makeCompletedSession()
    render(<ResultPage session={session} onRestart={() => {}} />)
    expect(screen.getByText(/문제 중/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '다시 해볼래요' })).toBeInTheDocument()
  })

  it('결과 타입 카드(label·description)를 렌더한다', () => {
    const session = makeCompletedSession()
    render(<ResultPage session={session} onRestart={() => {}} />)
    // RESULT_TYPES 중 하나의 label이 보여야 함
    const LABELS = [
      '디저트 감각파', '편의점 트렌드 추적자', 'SNS 바이럴 포착형',
      '추억 간식 마스터', '한 그릇 생활형',
    ]
    const found = LABELS.some((l) => screen.queryByText(l) !== null)
    expect(found).toBe(true)
  })

  it('session이 비정상이면 fallback UI를 렌더한다', () => {
    // null 강제 주입 → buildQuizResult 내부에서 TypeError → safeCalc이 null 반환
    render(<ResultPage session={null as unknown as QuizSession} onRestart={() => {}} />)
    expect(screen.getByText('결과를 계산하지 못했어요')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '다시 해볼래요' })).toBeInTheDocument()
  })
})
