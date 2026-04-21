import { describe, it, expect } from 'vitest'
import { resolveImageSrcFromMaps } from './imageAssets'

const ASSET_MAP = {
  q08: '/assets/images/quiz/dessert_trend/dalgonaLatte_2020.jpg',
}

const VISUAL_KEY_MAP = {
  dalgonaLatte_2020: '/assets/images/quiz/dessert_trend/dalgonaLatte_2020.jpg',
}

const CATEGORY_PLACEHOLDERS = {
  dessert_trend: '/assets/images/placeholder/dessert_trend.svg',
}

const DEFAULT = '/assets/images/placeholder/default.svg'

function resolve(
  questionId: string,
  visualAssetKey?: string,
  category = 'dessert_trend',
) {
  return resolveImageSrcFromMaps(
    questionId,
    visualAssetKey,
    category,
    ASSET_MAP,
    VISUAL_KEY_MAP,
    CATEGORY_PLACEHOLDERS,
    DEFAULT,
  )
}

describe('resolveImageSrcFromMaps', () => {
  it('questionId 매핑이 있으면 approved 반환', () => {
    const result = resolve('q08')
    expect(result.kind).toBe('approved')
    expect(result.src).toBe('/assets/images/quiz/dessert_trend/dalgonaLatte_2020.jpg')
  })

  it('questionId 없고 visualAssetKey 매핑이 있으면 approved 반환', () => {
    const result = resolve('q_unknown', 'dalgonaLatte_2020')
    expect(result.kind).toBe('approved')
    expect(result.src).toBe('/assets/images/quiz/dessert_trend/dalgonaLatte_2020.jpg')
  })

  it('questionId 매핑이 visualAssetKey보다 우선한다', () => {
    const result = resolveImageSrcFromMaps(
      'q08',
      'dalgonaLatte_2020',
      'dessert_trend',
      { q08: '/other.jpg' },
      VISUAL_KEY_MAP,
      CATEGORY_PLACEHOLDERS,
      DEFAULT,
    )
    expect(result.src).toBe('/other.jpg')
  })

  it('approved 매핑 없고 카테고리 placeholder가 있으면 category-placeholder 반환', () => {
    const result = resolve('q_none', undefined, 'dessert_trend')
    expect(result.kind).toBe('category-placeholder')
    expect(result.src).toBe('/assets/images/placeholder/dessert_trend.svg')
  })

  it('카테고리 placeholder도 없으면 default-placeholder 반환', () => {
    const result = resolve('q_none', undefined, 'unknown_cat')
    expect(result.kind).toBe('default-placeholder')
    expect(result.src).toBe(DEFAULT)
  })

  it('빈 visualAssetKey 문자열은 매핑 시도하지 않는다', () => {
    const result = resolve('q_none', '', 'unknown_cat')
    expect(result.kind).toBe('default-placeholder')
  })

  it('src는 항상 로컬 경로로 시작한다', () => {
    const cases = [
      resolve('q08'),
      resolve('q_none', 'dalgonaLatte_2020'),
      resolve('q_none', undefined, 'dessert_trend'),
      resolve('q_none', undefined, 'unknown_cat'),
    ]
    for (const r of cases) {
      expect(r.src.startsWith('/')).toBe(true)
      expect(r.src).not.toMatch(/^https?:\/\//)
    }
  })
})
