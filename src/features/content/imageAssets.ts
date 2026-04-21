import { ASSET_MANIFEST, buildAssetMap, buildVisualKeyMap } from './imageAssets/index'
import type { ResolvedImageSource } from './imageAssets/index'

const PLACEHOLDER_BASE = '/assets/images/placeholder'

// ── 카테고리별 placeholder ─────────────────────────────────────
export const CATEGORY_PLACEHOLDER: Record<string, string> = {
  dessert_trend:       `${PLACEHOLDER_BASE}/dessert_trend.svg`,
  snack_recall:        `${PLACEHOLDER_BASE}/snack_recall.svg`,
  convenience_dessert: `${PLACEHOLDER_BASE}/convenience_dessert.svg`,
  solo_meal:           `${PLACEHOLDER_BASE}/solo_meal.svg`,
  wellness_food:       `${PLACEHOLDER_BASE}/wellness_food.svg`,
}

export const DEFAULT_PLACEHOLDER = `${PLACEHOLDER_BASE}/default.svg`

// ── 문항별 실제 이미지 매핑 ──────────────────────────────────
// approvalStatus === 'approved' + localPath + questionId 항목만 포함됩니다.
// 새 이미지를 추가할 때는 imageAssets/manifest.ts에만 등록하세요.
const ASSET_MAP: Record<string, string> = buildAssetMap(ASSET_MANIFEST)

// visualAssetKey → localPath 보조 맵
const VISUAL_KEY_MAP: Record<string, string> = buildVisualKeyMap(ASSET_MANIFEST)

// ── 공개 API ──────────────────────────────────────────────────

/** question.id → 실제 이미지 URL. 등록된 에셋 없으면 null. */
export function getQuizImageSrc(questionId: string): string | null {
  return ASSET_MAP[questionId] ?? null
}

/** category → placeholder SVG URL. 카테고리 불일치 시 default 반환. */
export function getCategoryPlaceholder(category: string): string {
  return CATEGORY_PLACEHOLDER[category] ?? DEFAULT_PLACEHOLDER
}

/**
 * 순수 함수 — 주입된 맵으로 이미지 소스를 해석합니다 (테스트 가능).
 *
 * 우선순위:
 *   1. assetMap[questionId]         — questionId 기반 approved 매핑
 *   2. visualKeyMap[visualAssetKey] — visualAssetKey 기반 approved 매핑
 *   3. categoryPlaceholders[category] — 카테고리 SVG placeholder
 *   4. defaultPlaceholder            — 기본 placeholder
 *
 * 외부 URL은 절대 반환하지 않습니다.
 */
export function resolveImageSrcFromMaps(
  questionId: string,
  visualAssetKey: string | undefined,
  category: string,
  assetMap: Record<string, string>,
  visualKeyMap: Record<string, string>,
  categoryPlaceholders: Record<string, string>,
  defaultPlaceholder: string,
): ResolvedImageSource {
  const byQuestion = assetMap[questionId]
  if (byQuestion) return { kind: 'approved', src: byQuestion }

  if (visualAssetKey) {
    const byKey = visualKeyMap[visualAssetKey]
    if (byKey) return { kind: 'approved', src: byKey }
  }

  const byCategory = categoryPlaceholders[category]
  if (byCategory) return { kind: 'category-placeholder', src: byCategory }

  return { kind: 'default-placeholder', src: defaultPlaceholder }
}

/** 편의 래퍼 — 모듈 레벨 맵을 주입해 `resolveImageSrcFromMaps`를 호출합니다. */
export function resolveImageSrc(
  questionId: string,
  visualAssetKey: string | undefined,
  category: string,
): ResolvedImageSource {
  return resolveImageSrcFromMaps(
    questionId,
    visualAssetKey,
    category,
    ASSET_MAP,
    VISUAL_KEY_MAP,
    CATEGORY_PLACEHOLDER,
    DEFAULT_PLACEHOLDER,
  )
}
