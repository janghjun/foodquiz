import { STORAGE_KEYS } from '../../constants/storageKeys'

// ── 타입 ──────────────────────────────────────────────────────────

/** 키 출처: Toss SDK에서 받은 키 vs 로컬에서 생성한 키 */
export type AnonymousKeySource = 'toss' | 'local'

export interface AnonymousKeyResult {
  key: string
  source: AnonymousKeySource
}

/**
 * 향후 서버 연동 / 세그먼트 확장 시 단일 진입점으로 사용하는 유저 컨텍스트.
 * 현재는 로컬 전용이지만, 서버 API 도입 시 이 인터페이스만 확장합니다.
 *
 * 활용 예시:
 *   - logEvent에 user_key 포함 → 기기/세션 간 동일 사용자 집계
 *   - 서버에서 최근 타입·팩 기반 추천 fetch
 *   - A/B 세그먼트 분기
 */
export interface UserContext {
  anonymousKey: string
  source: AnonymousKeySource
  resolvedAt: string   // ISO 8601
}

// ── 내부 유틸 ─────────────────────────────────────────────────────

function generateLocalKey(): string {
  try {
    return crypto.randomUUID()
  } catch {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
  }
}

// ── 저장소 ───────────────────────────────────────────────────────

export function getStoredAnonymousKey(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEYS.ANONYMOUS_KEY)
  } catch {
    return null
  }
}

export function storeAnonymousKey(key: string): void {
  try {
    localStorage.setItem(STORAGE_KEYS.ANONYMOUS_KEY, key)
  } catch {
    // 저장 실패 무시 (private 모드 등)
  }
}

// ── 키 해결 ──────────────────────────────────────────────────────

/**
 * anonymous key를 해결합니다.
 *
 * 해결 순서:
 * 1. Apps in Toss SDK (window.TossApps.getAnonymousKey) 시도
 * 2. 실패·미주입 시 localStorage에 저장된 local UUID 재사용
 * 3. 저장된 키도 없으면 새 UUID를 생성해 저장
 *
 * 실패해도 항상 유효한 키를 반환합니다.
 */
export async function resolveAnonymousKey(): Promise<AnonymousKeyResult> {
  // 1. Toss SDK 시도
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sdk = (typeof window !== 'undefined') ? (window as any).TossApps : undefined
    if (typeof sdk?.getAnonymousKey === 'function') {
      const key = await sdk.getAnonymousKey()
      if (typeof key === 'string' && key.length > 0) {
        storeAnonymousKey(key)
        return { key, source: 'toss' }
      }
    }
  } catch {
    // Toss SDK 실패 → local fallback
  }

  // 2. 로컬 저장 키 재사용
  const stored = getStoredAnonymousKey()
  if (stored) {
    return { key: stored, source: 'local' }
  }

  // 3. 신규 local 키 생성
  const newKey = generateLocalKey()
  storeAnonymousKey(newKey)
  return { key: newKey, source: 'local' }
}

// ── UserContext 조합 ──────────────────────────────────────────────

/**
 * 저장된 anonymous key를 기반으로 UserContext를 동기적으로 반환합니다.
 * 키가 아직 해결되지 않았으면 null을 반환하므로, 앱 초기화 후 사용하세요.
 */
export function getUserContext(): UserContext | null {
  const key = getStoredAnonymousKey()
  if (!key) return null
  return {
    anonymousKey: key,
    source:       'local',   // resolveAnonymousKey 호출 전이면 항상 local
    resolvedAt:   new Date().toISOString(),
  }
}
