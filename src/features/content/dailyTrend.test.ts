import { describe, it, expect } from 'vitest'
import { getDailyTrendBite, TREND_BITES } from './dailyTrend'
import type { TrendBite } from './dailyTrend'

describe('getDailyTrendBite', () => {
  it('같은 날짜는 항상 같은 항목을 반환한다 (결정적)', () => {
    const a = getDailyTrendBite('2026-04-21')
    const b = getDailyTrendBite('2026-04-21')
    expect(a).not.toBeNull()
    expect(a!.id).toBe(b!.id)
  })

  it('날짜가 다르면 다른 항목을 반환할 수 있다', () => {
    const dates = ['2026-04-21', '2026-04-22', '2026-04-23', '2026-04-24', '2026-04-25']
    const ids = new Set(dates.map((d) => getDailyTrendBite(d)!.id))
    // 5일 중 적어도 2개 이상의 서로 다른 항목이 나와야 함 (10개 데이터 분산 확인)
    expect(ids.size).toBeGreaterThan(1)
  })

  it('반환값은 TrendBite 형태를 가진다', () => {
    const bite = getDailyTrendBite('2026-04-21')
    expect(bite).toMatchObject({
      id: expect.any(String),
      title: expect.any(String),
      description: expect.any(String),
      tags: expect.any(Array),
    })
  })

  it('결과값이 항상 TREND_BITES 내 항목이다', () => {
    for (let day = 1; day <= 20; day++) {
      const dateKey = `2026-04-${String(day).padStart(2, '0')}`
      const bite = getDailyTrendBite(dateKey)
      expect(bite).not.toBeNull()
      expect(TREND_BITES.some((b) => b.id === bite!.id)).toBe(true)
    }
  })

  it('dateKey 없이 호출해도 null이 아닌 항목을 반환한다', () => {
    const bite = getDailyTrendBite()
    expect(bite).not.toBeNull()
  })
})

describe('TREND_BITES 데이터 무결성', () => {
  it('모든 항목에 id, title, description, tags가 있다', () => {
    for (const bite of TREND_BITES) {
      expect(typeof bite.id).toBe('string')
      expect(bite.id.length).toBeGreaterThan(0)
      expect(typeof bite.title).toBe('string')
      expect(bite.title.length).toBeGreaterThan(0)
      expect(typeof bite.description).toBe('string')
      expect(bite.description.length).toBeGreaterThan(0)
      expect(Array.isArray(bite.tags)).toBe(true)
    }
  })

  it('id가 중복되지 않는다', () => {
    const ids = TREND_BITES.map((b) => b.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('categoryKey가 있는 항목은 유효한 key 형식이다', () => {
    const validKeys = new Set(['dessert', 'snack', 'convenience', 'meal', 'wellness'])
    const withKey = TREND_BITES.filter((b): b is TrendBite & { categoryKey: string } => !!b.categoryKey)
    expect(withKey.length).toBeGreaterThan(0)
    for (const bite of withKey) {
      expect(validKeys.has(bite.categoryKey)).toBe(true)
    }
  })

  it('데이터가 10개 이상 존재한다', () => {
    expect(TREND_BITES.length).toBeGreaterThanOrEqual(10)
  })
})
