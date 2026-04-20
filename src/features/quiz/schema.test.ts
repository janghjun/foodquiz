import { describe, it, expect } from 'vitest'
import { validateQuestion } from './schema'

const validMenuToYear = {
  id: 'q1',
  format: 'menu_to_year',
  category: 'dessert_trend',
  prompt: '버블티가 가장 크게 유행한 시기는?',
  menu: '버블티',
  choices: ['2000년대 초', '2010년대 초', '2020년대 초', '1990년대 말'],
  answer: '2000년대 초',
  explanation: '버블티는 2000년대 초 대만식 카페 열풍과 함께 국내에 급속도로 퍼졌어요.',
  evidenceLevel: 'A',
}

describe('validateQuestion', () => {
  it('유효한 menu_to_year 문항은 통과한다', () => {
    const result = validateQuestion(validMenuToYear)
    expect(result.ok).toBe(true)
  })

  it('evidenceLevel C 문항은 거부된다', () => {
    const result = validateQuestion({ ...validMenuToYear, evidenceLevel: 'C' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors[0]).toMatch(/evidenceLevel/)
  })

  it('answer가 choices에 없으면 거부된다', () => {
    const result = validateQuestion({ ...validMenuToYear, answer: '1980년대' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors[0]).toMatch(/choices/)
  })

  it('choices가 1개면 거부된다', () => {
    const result = validateQuestion({ ...validMenuToYear, choices: ['2000년대 초'] })
    expect(result.ok).toBe(false)
  })

  it('유효하지 않은 format은 거부된다', () => {
    const result = validateQuestion({ ...validMenuToYear, format: 'free_input' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors[0]).toMatch(/format/)
  })

  it('prompt가 없으면 거부된다', () => {
    const result = validateQuestion({ ...validMenuToYear, prompt: '' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors[0]).toMatch(/prompt/)
  })

  it('ox 문항 — choices가 ["O","X"]가 아니면 거부된다', () => {
    const result = validateQuestion({
      id: 'q2',
      format: 'ox',
      prompt: '2010년에 허니버터칩이 출시됐나요?',
      choices: ['예', '아니오'],
      answer: '예',
      explanation: '허니버터칩은 2014년 출시됐어요.',
      evidenceLevel: 'A',
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.some((e) => e.includes('ox'))).toBe(true)
  })

  it('ox 문항 — 정상 케이스는 통과한다', () => {
    const result = validateQuestion({
      id: 'q2',
      format: 'ox',
      category: 'snack_recall',
      prompt: '허니버터칩은 2014년에 출시됐나요?',
      choices: ['O', 'X'],
      answer: 'O',
      explanation: '허니버터칩은 2014년 해태제과에서 출시해 품귀 현상을 일으켰어요.',
      evidenceLevel: 'B',
    })
    expect(result.ok).toBe(true)
  })

  it('null을 넘기면 거부된다', () => {
    const result = validateQuestion(null)
    expect(result.ok).toBe(false)
  })

  it('id가 빈 문자열이면 거부된다', () => {
    const result = validateQuestion({ ...validMenuToYear, id: '' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors[0]).toMatch(/id/)
  })

  it('배열을 넘기면 거부된다', () => {
    const result = validateQuestion([{ id: 'q1' }])
    expect(result.ok).toBe(false)
  })

  it('year_to_menu — year 필드가 없으면 거부된다', () => {
    const result = validateQuestion({
      id: 'y1',
      format: 'year_to_menu',
      category: 'snack_recall',
      prompt: '1998년의 인기 음료는?',
      choices: ['포카리스웨트', '게토레이', '파워에이드', '비타500'],
      answer: '포카리스웨트',
      explanation: '포카리스웨트는 1990년대 대표 스포츠음료였어요.',
      evidenceLevel: 'A',
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.some((e) => e.includes('year'))).toBe(true)
  })

  it('image_to_year — imageUrl 필드가 없으면 거부된다', () => {
    const result = validateQuestion({
      id: 'i1',
      format: 'image_to_year',
      category: 'convenience_dessert',
      prompt: '이 상품이 크게 유행한 건 언제?',
      choices: ['2000년대', '2010년대', '2020년대'],
      answer: '2010년대',
      explanation: '허니버터칩은 2014년에 유행했어요.',
      evidenceLevel: 'A',
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.some((e) => e.includes('imageUrl'))).toBe(true)
  })
})
