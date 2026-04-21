import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  resolveAnonymousKey,
  getStoredAnonymousKey,
  storeAnonymousKey,
  getUserContext,
} from './anonymousKey'
import { STORAGE_KEYS } from '../../constants/storageKeys'

// ── 픽스처 / 유틸 ────────────────────────────────────────────────

function clearTossSDK() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (window as any).TossApps
}

function setTossSDK(key: string | null | (() => Promise<string>)) {
  const getAnonymousKey =
    typeof key === 'function'
      ? key
      : vi.fn().mockResolvedValue(key)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(window as any).TossApps = { getAnonymousKey }
}

beforeEach(() => {
  localStorage.clear()
  clearTossSDK()
})

afterEach(() => {
  clearTossSDK()
})

// ── getStoredAnonymousKey / storeAnonymousKey ────────────────────

describe('getStoredAnonymousKey', () => {
  it('저장된 키가 없으면 null을 반환한다', () => {
    expect(getStoredAnonymousKey()).toBeNull()
  })

  it('저장된 키가 있으면 반환한다', () => {
    localStorage.setItem(STORAGE_KEYS.ANONYMOUS_KEY, 'test-key-123')
    expect(getStoredAnonymousKey()).toBe('test-key-123')
  })
})

describe('storeAnonymousKey', () => {
  it('키를 localStorage에 저장한다', () => {
    storeAnonymousKey('my-anon-key')
    expect(localStorage.getItem(STORAGE_KEYS.ANONYMOUS_KEY)).toBe('my-anon-key')
  })
})

// ── resolveAnonymousKey — Toss SDK ────────────────────────────────

describe('resolveAnonymousKey — Toss SDK 사용 가능', () => {
  it('Toss SDK에서 키를 받으면 source: toss를 반환한다', async () => {
    setTossSDK('toss-anon-abc-123')
    const result = await resolveAnonymousKey()
    expect(result.key).toBe('toss-anon-abc-123')
    expect(result.source).toBe('toss')
  })

  it('Toss SDK 키를 localStorage에 저장한다', async () => {
    setTossSDK('toss-key-xyz')
    await resolveAnonymousKey()
    expect(localStorage.getItem(STORAGE_KEYS.ANONYMOUS_KEY)).toBe('toss-key-xyz')
  })

  it('Toss SDK가 빈 문자열을 반환하면 local fallback을 사용한다', async () => {
    setTossSDK('')
    const result = await resolveAnonymousKey()
    expect(result.source).toBe('local')
    expect(result.key.length).toBeGreaterThan(0)
  })

  it('Toss SDK가 null을 반환하면 local fallback을 사용한다', async () => {
    setTossSDK(null)
    const result = await resolveAnonymousKey()
    expect(result.source).toBe('local')
  })
})

// ── resolveAnonymousKey — Toss SDK 실패 ─────────────────────────

describe('resolveAnonymousKey — Toss SDK 실패 fallback', () => {
  it('Toss SDK가 throw하면 local fallback을 사용한다', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(window as any).TossApps = {
      getAnonymousKey: vi.fn().mockRejectedValue(new Error('SDK 오류')),
    }
    const result = await resolveAnonymousKey()
    expect(result.source).toBe('local')
    expect(result.key.length).toBeGreaterThan(0)
  })

  it('Toss SDK 미주입 환경에서도 오류 없이 local 키를 반환한다', async () => {
    clearTossSDK()
    await expect(resolveAnonymousKey()).resolves.toMatchObject({ source: 'local' })
  })
})

// ── resolveAnonymousKey — local fallback 동작 ───────────────────

describe('resolveAnonymousKey — local fallback', () => {
  it('저장된 로컬 키가 있으면 재사용한다', async () => {
    localStorage.setItem(STORAGE_KEYS.ANONYMOUS_KEY, 'existing-local-key')
    const result = await resolveAnonymousKey()
    expect(result.key).toBe('existing-local-key')
    expect(result.source).toBe('local')
  })

  it('저장된 키가 없으면 새 UUID를 생성해 저장한다', async () => {
    const result = await resolveAnonymousKey()
    expect(result.source).toBe('local')
    expect(result.key.length).toBeGreaterThan(0)
    expect(localStorage.getItem(STORAGE_KEYS.ANONYMOUS_KEY)).toBe(result.key)
  })

  it('두 번 호출하면 같은 local 키를 반환한다', async () => {
    const first  = await resolveAnonymousKey()
    const second = await resolveAnonymousKey()
    expect(first.key).toBe(second.key)
  })
})

// ── getUserContext ────────────────────────────────────────────────

describe('getUserContext', () => {
  it('키가 없으면 null을 반환한다', () => {
    expect(getUserContext()).toBeNull()
  })

  it('키가 있으면 UserContext를 반환한다', () => {
    localStorage.setItem(STORAGE_KEYS.ANONYMOUS_KEY, 'ctx-key-001')
    const ctx = getUserContext()
    expect(ctx).not.toBeNull()
    expect(ctx!.anonymousKey).toBe('ctx-key-001')
    expect(typeof ctx!.resolvedAt).toBe('string')
    expect(() => new Date(ctx!.resolvedAt)).not.toThrow()
  })

  it('resolveAnonymousKey 호출 이후 getUserContext가 키를 반환한다', async () => {
    await resolveAnonymousKey()
    const ctx = getUserContext()
    expect(ctx).not.toBeNull()
    expect(ctx!.anonymousKey.length).toBeGreaterThan(0)
  })
})

// ── 기존 로컬 저장 구조와 충돌 없음 ─────────────────────────────

describe('기존 UserQuizState와 격리', () => {
  it('ANONYMOUS_KEY 저장이 USER_QUIZ_STATE를 덮어쓰지 않는다', async () => {
    const quizState = JSON.stringify({ schemaVersion: 1, history: [] })
    localStorage.setItem(STORAGE_KEYS.USER_QUIZ_STATE, quizState)

    await resolveAnonymousKey()

    expect(localStorage.getItem(STORAGE_KEYS.USER_QUIZ_STATE)).toBe(quizState)
  })

  it('별도 key를 사용해 저장한다', async () => {
    await resolveAnonymousKey()
    expect(localStorage.getItem(STORAGE_KEYS.ANONYMOUS_KEY)).not.toBeNull()
    // 다른 key들은 영향받지 않음
    expect(localStorage.getItem(STORAGE_KEYS.USER_QUIZ_STATE)).toBeNull()
    expect(localStorage.getItem(STORAGE_KEYS.REVIEW_PROMPT)).toBeNull()
  })
})
