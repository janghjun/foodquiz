import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  loadPack,
  clearPackCache,
  buildLocalPack,
  PACK_USER_ERRORS,
} from './loadPack'

const validQuestion = {
  id: 'q1',
  format: 'menu_to_year',
  category: 'dessert_trend',
  menu: '버블티',
  prompt: '버블티가 유행한 건 언제?',
  choices: ['2000년대', '2010년대', '2020년대', '1990년대'],
  answer: '2000년대',
  explanation: '버블티는 2000년대 초 유행했어요.',
  evidenceLevel: 'A',
}

const validRemotePack = {
  packId: 'remote-pack',
  title: 'Remote Quiz',
  questions: [validQuestion],
}

beforeEach(() => {
  clearPackCache()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('loadPack — local', () => {
  it('returns local pack when no remoteUrl given', async () => {
    const { pack, source } = await loadPack()
    expect(source).toBe('local')
    expect(pack.questions.length).toBeGreaterThan(0)
  })

  it('caches the local pack on second call', async () => {
    const first = await loadPack()
    const second = await loadPack()
    expect(second.pack).toBe(first.pack)
  })
})

describe('loadPack — remote success', () => {
  it('returns remote pack and source when fetch succeeds', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => validRemotePack,
    }))

    const { pack, source } = await loadPack({ remoteUrl: 'https://example.com/pack.json' })
    expect(source).toBe('remote')
    expect(pack.packId).toBe('remote-pack')
    expect(pack.questions).toHaveLength(1)
  })

  it('caches remote result — second call skips fetch', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => validRemotePack,
    })
    vi.stubGlobal('fetch', fetchMock)

    await loadPack({ remoteUrl: 'https://example.com/pack.json' })
    await loadPack({ remoteUrl: 'https://example.com/pack.json' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('bustCache bypasses cache and re-fetches', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => validRemotePack,
    })
    vi.stubGlobal('fetch', fetchMock)

    await loadPack({ remoteUrl: 'https://example.com/pack.json' })
    await loadPack({ remoteUrl: 'https://example.com/pack.json', bustCache: true })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})

describe('loadPack — remote fallback', () => {
  it('falls back to local when network throws', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    const { pack, source } = await loadPack({ remoteUrl: 'https://example.com/pack.json' })
    expect(source).toBe('local')
    expect(pack.questions.length).toBeGreaterThan(0)
  })

  it('falls back to local on HTTP error status', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503 }))

    const { source } = await loadPack({ remoteUrl: 'https://example.com/pack.json' })
    expect(source).toBe('local')
  })

  it('falls back to local when response JSON is malformed', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => { throw new SyntaxError('Unexpected token') },
    }))

    const { source } = await loadPack({ remoteUrl: 'https://example.com/pack.json' })
    expect(source).toBe('local')
  })

  it('falls back to local when remote pack shape is invalid', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ not: 'a pack' }),
    }))

    const { source } = await loadPack({ remoteUrl: 'https://example.com/pack.json' })
    expect(source).toBe('local')
  })

  it('falls back to local when remote pack has no valid questions', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ packId: 'x', title: 'y', questions: [] }),
    }))

    const { source } = await loadPack({ remoteUrl: 'https://example.com/pack.json' })
    expect(source).toBe('local')
  })
})

describe('loadPack — invalid question filtering', () => {
  it('silently excludes questions that fail validation', async () => {
    const packWithBadQuestion = {
      packId: 'remote-pack',
      title: 'Remote Quiz',
      questions: [validQuestion, { id: 'bad', format: 'menu_to_year' }],
    }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => packWithBadQuestion,
    }))

    const { pack } = await loadPack({ remoteUrl: 'https://example.com/pack.json' })
    expect(pack.questions).toHaveLength(1)
  })
})

describe('PACK_USER_ERRORS', () => {
  it('has Korean user-facing messages', () => {
    expect(PACK_USER_ERRORS.NETWORK).toBeTruthy()
    expect(PACK_USER_ERRORS.INVALID).toBeTruthy()
    expect(PACK_USER_ERRORS.EMPTY).toBeTruthy()
  })
})

describe('buildLocalPack', () => {
  it('returns a valid pack synchronously', () => {
    const pack = buildLocalPack()
    expect(pack.packId).toBeTruthy()
    expect(pack.questions.length).toBeGreaterThan(0)
  })
})
