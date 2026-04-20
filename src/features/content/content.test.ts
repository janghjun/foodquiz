import { describe, it, expect } from 'vitest'
import { validateQuestion } from '../quiz/schema'
import type { QuestionFormat, QuestionCategory } from '../quiz/types'
import { buildPackFromRaw, getActiveSeasonMeta } from './loadPack'
import rawPack from './mockPack.json'
import rawSeasonPack from './seasonPack.json'

describe('mockPack', () => {
  it('50문항을 모두 포함한다', () => {
    expect(rawPack.questions).toHaveLength(50)
  })

  it('모든 문항이 schema validation을 통과한다', () => {
    for (const q of rawPack.questions) {
      const result = validateQuestion(q)
      expect(result.ok, `${q.id} 실패: ${!result.ok ? result.errors.join(', ') : ''}`).toBe(true)
    }
  })

  it('4종 format이 모두 포함된다', () => {
    const formats = new Set(rawPack.questions.map((q) => q.format as QuestionFormat))
    expect(formats.has('menu_to_year')).toBe(true)
    expect(formats.has('year_to_menu')).toBe(true)
    expect(formats.has('image_to_year')).toBe(true)
    expect(formats.has('ox')).toBe(true)
  })

  it('5종 category가 모두 포함된다', () => {
    const cats = new Set(rawPack.questions.map((q) => (q as { category: QuestionCategory }).category))
    expect(cats.has('dessert_trend')).toBe(true)
    expect(cats.has('snack_recall')).toBe(true)
    expect(cats.has('convenience_dessert')).toBe(true)
    expect(cats.has('solo_meal')).toBe(true)
    expect(cats.has('wellness_food')).toBe(true)
  })

  it('evidenceLevel C 문항이 없다', () => {
    const cLevel = rawPack.questions.filter(
      (q) => (q as { evidenceLevel: string }).evidenceLevel === 'C',
    )
    expect(cLevel).toHaveLength(0)
  })

  it('meta.isSeasonal이 false다', () => {
    const pack = buildPackFromRaw(rawPack)
    expect(pack.meta?.isSeasonal).toBe(false)
  })

  it('기본팩은 getActiveSeasonMeta가 null이다', () => {
    const pack = buildPackFromRaw(rawPack)
    expect(getActiveSeasonMeta(pack)).toBeNull()
  })
})

describe('seasonPack', () => {
  const season = buildPackFromRaw(rawSeasonPack)

  it('meta.isSeasonal이 true다', () => {
    expect(season.meta?.isSeasonal).toBe(true)
  })

  it('status가 active인 시즌팩은 getActiveSeasonMeta가 meta를 반환한다', () => {
    const meta = getActiveSeasonMeta(season)
    expect(meta).not.toBeNull()
    expect(meta?.packId).toBe('season-2026-spring')
  })

  it('모든 시즌 문항이 schema validation을 통과한다', () => {
    for (const q of rawSeasonPack.questions) {
      const result = validateQuestion(q)
      expect(result.ok, `${q.id} 실패: ${!result.ok ? result.errors.join(', ') : ''}`).toBe(true)
    }
  })

  it('getActiveSeasonMeta는 subtitle을 포함한다', () => {
    const meta = getActiveSeasonMeta(season)
    expect(typeof meta?.subtitle).toBe('string')
    expect(meta!.subtitle.length).toBeGreaterThan(0)
  })

  it('status가 expired면 getActiveSeasonMeta가 null이다', () => {
    const expiredPack = buildPackFromRaw({
      ...rawSeasonPack,
      meta: { ...rawSeasonPack.meta, status: 'expired' },
    })
    expect(getActiveSeasonMeta(expiredPack)).toBeNull()
  })
})
