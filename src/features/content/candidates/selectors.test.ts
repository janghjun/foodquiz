import { describe, it, expect } from 'vitest'
import {
  getActiveCandidates,
  getCandidatesByStatus,
  getCandidatesByCategory,
  getSeasonPackCandidates,
  getSeasonPackCandidatesByCategory,
  isQuestionReady,
  validateCandidate,
  validateRegistry,
} from './selectors'
import { CANDIDATE_REGISTRY } from './registry'
import type { TrendFoodCandidate } from './types'

// ── 픽스처 ───────────────────────────────────────────────────────

function makeCandidate(overrides: Partial<TrendFoodCandidate> = {}): TrendFoodCandidate {
  return {
    id: 'cnd_test',
    name: '테스트 후보',
    category: 'dessert',
    sourceType: 'sns',
    firstSeenAt: '2024-01-01',
    peakStartAt: '2024-06-01',
    trendStatus: 'active',
    visualKeywords: ['키워드1'],
    tags: ['태그1'],
    evidenceLevel: 'A',
    questionReady: true,
    ...overrides,
  }
}

const ALL = CANDIDATE_REGISTRY

// ── 레지스트리 데이터 무결성 ─────────────────────────────────────

describe('CANDIDATE_REGISTRY 무결성', () => {
  it('레지스트리가 비어있지 않다', () => {
    expect(ALL.length).toBeGreaterThan(0)
  })

  it('모든 항목의 id가 유일하다', () => {
    const ids = ALL.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('모든 항목이 schema 검증을 통과한다', () => {
    const { invalid } = validateRegistry(ALL)
    if (invalid.length > 0) {
      const msgs = invalid.map((i) => `${i.candidate.id}: ${i.errors.join(', ')}`).join('\n')
      expect.fail(`schema 검증 실패:\n${msgs}`)
    }
  })

  it('evidenceLevel C 항목이 없다', () => {
    const withC = ALL.filter((c) => (c.evidenceLevel as string) === 'C')
    expect(withC).toHaveLength(0)
  })
})

// ── validateCandidate ─────────────────────────────────────────────

describe('validateCandidate', () => {
  it('유효한 후보는 ok: true를 반환한다', () => {
    expect(validateCandidate(makeCandidate()).ok).toBe(true)
  })

  it('id 없으면 에러', () => {
    const r = validateCandidate(makeCandidate({ id: '' }))
    expect(r.ok).toBe(false)
    expect(r.errors).toContain('id 필수')
  })

  it('name 없으면 에러', () => {
    const r = validateCandidate(makeCandidate({ name: '' }))
    expect(r.ok).toBe(false)
    expect(r.errors).toContain('name 필수')
  })

  it('유효하지 않은 trendStatus이면 에러', () => {
    const r = validateCandidate(makeCandidate({ trendStatus: 'unknown' as never }))
    expect(r.ok).toBe(false)
    expect(r.errors.some((e) => e.includes('trendStatus'))).toBe(true)
  })

  it('evidenceLevel C이면 에러', () => {
    const r = validateCandidate(makeCandidate({ evidenceLevel: 'C' as never }))
    expect(r.ok).toBe(false)
    expect(r.errors.some((e) => e.includes('evidenceLevel'))).toBe(true)
  })

  it('firstSeenAt 형식 오류이면 에러', () => {
    const r = validateCandidate(makeCandidate({ firstSeenAt: '2024/01/01' }))
    expect(r.ok).toBe(false)
    expect(r.errors.some((e) => e.includes('firstSeenAt'))).toBe(true)
  })

  it('peakStartAt 형식 오류이면 에러', () => {
    const r = validateCandidate(makeCandidate({ peakStartAt: 'invalid' }))
    expect(r.ok).toBe(false)
    expect(r.errors.some((e) => e.includes('peakStartAt'))).toBe(true)
  })

  it('visualKeywords 빈 배열이면 에러', () => {
    const r = validateCandidate(makeCandidate({ visualKeywords: [] }))
    expect(r.ok).toBe(false)
    expect(r.errors.some((e) => e.includes('visualKeywords'))).toBe(true)
  })

  it('tags 빈 배열이면 에러', () => {
    const r = validateCandidate(makeCandidate({ tags: [] }))
    expect(r.ok).toBe(false)
    expect(r.errors.some((e) => e.includes('tags'))).toBe(true)
  })
})

// ── getActiveCandidates ──────────────────────────────────────────

describe('getActiveCandidates', () => {
  it('archived 항목을 제외한다', () => {
    const result = getActiveCandidates(ALL)
    expect(result.every((c) => c.trendStatus !== 'archived')).toBe(true)
  })

  it('레지스트리에 archived가 있으면 결과 수가 줄어든다', () => {
    const archivedCount = ALL.filter((c) => c.trendStatus === 'archived').length
    expect(archivedCount).toBeGreaterThan(0)
    expect(getActiveCandidates(ALL).length).toBe(ALL.length - archivedCount)
  })

  it('빈 배열 입력 시 빈 배열 반환', () => {
    expect(getActiveCandidates([])).toHaveLength(0)
  })
})

// ── getCandidatesByStatus ────────────────────────────────────────

describe('getCandidatesByStatus', () => {
  it('rising 상태만 반환한다', () => {
    const result = getCandidatesByStatus(ALL, 'rising')
    expect(result.every((c) => c.trendStatus === 'rising')).toBe(true)
  })

  it('archived 상태만 반환한다', () => {
    const result = getCandidatesByStatus(ALL, 'archived')
    expect(result.every((c) => c.trendStatus === 'archived')).toBe(true)
    expect(result.length).toBeGreaterThan(0)
  })

  it('존재하지 않는 상태 요청 시 빈 배열 반환', () => {
    expect(getCandidatesByStatus(ALL, 'peak')).toHaveLength(0)  // 레지스트리에 peak 없음
  })
})

// ── getCandidatesByCategory ──────────────────────────────────────

describe('getCandidatesByCategory', () => {
  it('dessert 카테고리만 반환한다', () => {
    const result = getCandidatesByCategory(ALL, 'dessert')
    expect(result.length).toBeGreaterThan(0)
    expect(result.every((c) => c.category === 'dessert')).toBe(true)
  })

  it('카테고리가 없는 경우 빈 배열 반환', () => {
    expect(getCandidatesByCategory(ALL, 'meal')).toHaveLength(0)  // 레지스트리에 meal 없음
  })
})

// ── isQuestionReady ──────────────────────────────────────────────

describe('isQuestionReady', () => {
  it('questionReady: true이면 true', () => {
    expect(isQuestionReady(makeCandidate({ questionReady: true }))).toBe(true)
  })

  it('questionReady: false이면 — evidenceA + peakStartAt 있어도 false (명시 우선)', () => {
    // questionReady: false는 명시적 비준비를 의미하므로 자동판정 적용 안 함
    // 단, questionReady === false 는 undefined/true와 다른 경우
    // 실제 로직: questionReady === true만 즉시 true. 아니면 자동 조건 확인
    const c = makeCandidate({ questionReady: false, evidenceLevel: 'A', peakStartAt: '2024-01-01', trendStatus: 'active' })
    // questionReady가 false가 아닌 undefined여야 자동판정 작동함
    expect(isQuestionReady(c)).toBe(false)
  })

  it('questionReady 미정 + evidenceA + peakStartAt + active → true', () => {
    const c = makeCandidate({ questionReady: undefined, evidenceLevel: 'A', peakStartAt: '2024-01-01', trendStatus: 'active' })
    expect(isQuestionReady(c)).toBe(true)
  })

  it('questionReady 미정 + evidenceB → false', () => {
    const c = makeCandidate({ questionReady: undefined, evidenceLevel: 'B' })
    expect(isQuestionReady(c)).toBe(false)
  })

  it('questionReady 미정 + evidenceA + peakStartAt 없음 → false', () => {
    const c = makeCandidate({ questionReady: undefined, evidenceLevel: 'A', peakStartAt: undefined })
    expect(isQuestionReady(c)).toBe(false)
  })

  it('questionReady 미정 + archived → false', () => {
    const c = makeCandidate({ questionReady: undefined, evidenceLevel: 'A', peakStartAt: '2024-01-01', trendStatus: 'archived' })
    expect(isQuestionReady(c)).toBe(false)
  })
})

// ── getSeasonPackCandidates ──────────────────────────────────────

describe('getSeasonPackCandidates', () => {
  it('archived 항목은 포함되지 않는다', () => {
    const result = getSeasonPackCandidates(ALL)
    expect(result.every((c) => c.trendStatus !== 'archived')).toBe(true)
  })

  it('declining 항목은 포함되지 않는다', () => {
    const result = getSeasonPackCandidates(ALL)
    expect(result.every((c) => c.trendStatus !== 'declining')).toBe(true)
  })

  it('isQuestionReady가 false인 항목은 포함되지 않는다', () => {
    const candidates = [
      makeCandidate({ id: 'a', trendStatus: 'active', questionReady: true }),
      makeCandidate({ id: 'b', trendStatus: 'active', questionReady: false, evidenceLevel: 'B' }),
    ]
    const result = getSeasonPackCandidates(candidates)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('a')
  })

  it('레지스트리에서 eligible한 항목이 1개 이상 반환된다', () => {
    expect(getSeasonPackCandidates(ALL).length).toBeGreaterThan(0)
  })
})

// ── getSeasonPackCandidatesByCategory ────────────────────────────

describe('getSeasonPackCandidatesByCategory', () => {
  it('dessert 카테고리의 eligible 후보만 반환한다', () => {
    const result = getSeasonPackCandidatesByCategory(ALL, 'dessert')
    expect(result.every((c) => c.category === 'dessert')).toBe(true)
    expect(result.every((c) => c.trendStatus !== 'archived')).toBe(true)
  })
})
