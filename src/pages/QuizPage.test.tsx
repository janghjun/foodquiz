import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import QuizPage from './QuizPage'

describe('QuizPage smoke', () => {
  it('첫 문제 진행률 1/10을 렌더한다', () => {
    render(<QuizPage onFinish={() => {}} />)
    expect(screen.getByText('1 / 10')).toBeInTheDocument()
  })

  it('4종 format badge 중 하나를 렌더한다', () => {
    render(<QuizPage onFinish={() => {}} />)
    const BADGES = ['언제 유행했을까요', '그해의 메뉴는?', '이미지로 맞혀요', 'O / X 퀴즈']
    const found = BADGES.some((b) => screen.queryByText(b) !== null)
    expect(found).toBe(true)
  })

  it('선택지 버튼이 최소 2개 렌더된다', () => {
    render(<QuizPage onFinish={() => {}} />)
    const buttons = screen.getAllByRole('button')
    // 선택지 버튼들 (최소 2개) + 진행 중에는 다음 버튼 없음
    expect(buttons.length).toBeGreaterThanOrEqual(2)
  })
})
