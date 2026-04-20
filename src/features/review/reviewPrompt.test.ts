import { describe, it, expect } from 'vitest'
import { checkReviewEligibility } from './reviewPrompt'
import type { PlayRecord } from '../history/types'

function makeRecord(score: number, packId = 'mock-pack'): PlayRecord {
  return {
    playedAt: new Date().toISOString(),
    correctCount: Math.round(score / 10),
    totalCount: 10,
    score,
    resultType: 'foodie',
    packId,
  }
}

describe('checkReviewEligibility', () => {
  it('플레이 횟수 2회 미만이면 false', () => {
    expect(checkReviewEligibility([makeRecord(80)])).toBe(false)
  })

  it('최근 점수 70% 미만이면 false', () => {
    expect(checkReviewEligibility([makeRecord(60), makeRecord(80)])).toBe(false)
  })

  it('모든 조건을 만족하고 lastPromptAt 없으면 true', () => {
    expect(checkReviewEligibility([makeRecord(70), makeRecord(80)])).toBe(true)
  })

  it('마지막 리뷰 요청이 7일 이내면 false', () => {
    const recent = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    expect(checkReviewEligibility([makeRecord(80), makeRecord(90)], recent)).toBe(false)
  })

  it('마지막 리뷰 요청이 7일 초과면 true', () => {
    const old = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString()
    expect(checkReviewEligibility([makeRecord(80), makeRecord(90)], old)).toBe(true)
  })
})
