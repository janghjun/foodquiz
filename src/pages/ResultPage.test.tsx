import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ResultPage from './ResultPage'
import type { QuizSession } from '../features/quiz'
import { createQuizSession, submitAnswer, goNext } from '../features/quiz'
import { mockPack } from '../features/content'

// 테스트 간 localStorage 오염 방지
beforeEach(() => {
  localStorage.clear()
})

// mockPack (활성 팩) 기준으로 세션 생성 — ResultPage의 getWrongNoteQuestions와 같은 팩 사용
function makeCompletedSession(allCorrect = true): QuizSession {
  let s = createQuizSession(mockPack.questions)
  for (const q of s.questions) {
    s = submitAnswer(s, allCorrect ? q.answer : '__wrong__')
    s = goNext(s)
  }
  return s
}

const RESULT_LABELS = [
  '디저트 감각파', '편의점 트렌드 추적자', 'SNS 바이럴 포착형',
  '추억 간식 마스터', '한 그릇 생활형',
]

describe('ResultPage 2.0', () => {
  it('결과 타입 label이 렌더된다', () => {
    render(<ResultPage session={makeCompletedSession()} onRestart={() => {}} />)
    const found = RESULT_LABELS.some((l) => screen.queryByText(l) !== null)
    expect(found).toBe(true)
  })

  it('점수 배지(N/10)가 렌더된다', () => {
    render(<ResultPage session={makeCompletedSession()} onRestart={() => {}} />)
    expect(screen.getByText(/^\d+$/)).toBeInTheDocument()
  })

  it('다시 해봐요 버튼이 있고 클릭 시 onRestart 호출', () => {
    const onRestart = vi.fn()
    render(<ResultPage session={makeCompletedSession()} onRestart={onRestart} />)
    fireEvent.click(screen.getByRole('button', { name: '다시 해봐요' }))
    expect(onRestart).toHaveBeenCalledTimes(1)
  })

  it('추천 CTA 버튼이 렌더된다', () => {
    render(<ResultPage session={makeCompletedSession()} onRestart={() => {}} />)
    const btn = screen.getAllByRole('button')
    expect(btn.length).toBeGreaterThanOrEqual(2)
  })

  it('전체 정답이면 오답 복습 fallback 문구가 뜬다', () => {
    render(<ResultPage session={makeCompletedSession(true)} onRestart={() => {}} />)
    expect(screen.getByText('모든 문제를 맞혔어요!')).toBeInTheDocument()
  })

  it('오답이 있으면 오답 미리보기 토글 버튼이 뜬다', () => {
    const session = makeCompletedSession(false)
    render(<ResultPage session={session} onRestart={() => {}} />)
    expect(screen.getByRole('button', { name: /오답 미리 보기/ })).toBeInTheDocument()
  })

  it('오답이 있고 onStartReview 제공 시 틀린 문제 다시 풀래요 CTA가 뜬다', () => {
    const session = makeCompletedSession(false)
    render(<ResultPage session={session} onRestart={() => {}} onStartReview={() => {}} />)
    expect(screen.getByRole('button', { name: '틀린 문제 다시 풀래요' })).toBeInTheDocument()
  })

  it('onStartReview 클릭 시 QuizSession을 인수로 콜백 호출', () => {
    const onStartReview = vi.fn()
    const session = makeCompletedSession(false)
    render(<ResultPage session={session} onRestart={() => {}} onStartReview={onStartReview} />)
    fireEvent.click(screen.getByRole('button', { name: '틀린 문제 다시 풀래요' }))
    expect(onStartReview).toHaveBeenCalledTimes(1)
    // 복습 세션(QuizSession)을 인수로 전달하는지 확인
    expect(onStartReview.mock.calls[0][0]).toMatchObject({
      sessionType: 'wrong-only',
      completedAt: null,
    })
  })

  it('session이 비정상이면 fallback UI를 렌더한다', () => {
    render(<ResultPage session={null as unknown as QuizSession} onRestart={() => {}} />)
    expect(screen.getByText('결과를 계산하지 못했어요')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '다시 해볼래요' })).toBeInTheDocument()
  })
})
