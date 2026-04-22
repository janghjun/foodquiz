import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { buildShareText, shareResult, shareStoryCard, captureShareCard } from './shareCard'
import type { ShareCardData } from './shareCard'

// ── 픽스처 ───────────────────────────────────────────────────────

function makeData(overrides: Partial<ShareCardData> = {}): ShareCardData {
  return {
    resultTypeLabel: '디저트 감각파',
    resultTypeId:    'dessert-sensor',
    correctCount:    8,
    totalCount:      10,
    ...overrides,
  }
}

// ── buildShareText ───────────────────────────────────────────────

describe('buildShareText', () => {
  it('결과 타입 레이블이 포함된다', () => {
    const { full } = buildShareText(makeData())
    expect(full).toContain('디저트 감각파')
  })

  it('점수가 포함된다', () => {
    const { full } = buildShareText(makeData({ correctCount: 7, totalCount: 10 }))
    expect(full).toContain('7/10')
  })

  it('앱 이름이 항상 포함된다', () => {
    const { full } = buildShareText(makeData())
    expect(full).toContain('먹퀴즈')
  })

  it('결과 타입별 이모지가 포함된다', () => {
    const cases: [string, string][] = [
      ['dessert-sensor',         '🍰'],
      ['convenience-tracker',    '🛒'],
      ['sns-viral-catcher',      '📱'],
      ['snack-nostalgia-master', '🍭'],
      ['solo-lifestyle',         '🍜'],
    ]
    for (const [id, emoji] of cases) {
      const { title } = buildShareText(makeData({ resultTypeId: id }))
      expect(title).toContain(emoji)
    }
  })

  it('resultTypeId 없을 때 fallback 이모지를 사용한다', () => {
    const { title } = buildShareText(makeData({ resultTypeId: undefined }))
    expect(title).toContain('🍽️')
  })

  it('resultTypeLabel 비어있으면 fallback 문구를 사용한다', () => {
    const { full } = buildShareText(makeData({ resultTypeLabel: '' }))
    expect(full).toContain('푸드 트렌드 탐험가')
    expect(full).toContain('먹퀴즈')
  })

  it('full은 title + body + footer를 포함한다', () => {
    const { title, body, footer, full } = buildShareText(makeData())
    expect(full).toContain(title)
    expect(full).toContain(body)
    expect(full).toContain(footer)
  })

  it('너는 몇 점일까요 유입 문구가 포함된다', () => {
    const { body } = buildShareText(makeData())
    expect(body).toContain('너는 몇 점일까요?')
  })
})

// ── shareResult ──────────────────────────────────────────────────

describe('shareResult', () => {
  let originalShare: typeof navigator.share | undefined
  let originalClipboard: Clipboard

  beforeEach(() => {
    originalShare = navigator.share
    originalClipboard = navigator.clipboard
  })

  afterEach(() => {
    Object.defineProperty(navigator, 'share', {
      value:        originalShare,
      configurable: true,
      writable:     true,
    })
    Object.defineProperty(navigator, 'clipboard', {
      value:        originalClipboard,
      configurable: true,
      writable:     true,
    })
  })

  it('Web Share API 사용 가능 시 shared를 반환한다', async () => {
    Object.defineProperty(navigator, 'share', {
      value:        vi.fn().mockResolvedValue(undefined),
      configurable: true,
      writable:     true,
    })
    const result = await shareResult(makeData())
    expect(result).toBe('shared')
  })

  it('Web Share API 취소 시 clipboard fallback으로 copied를 반환한다', async () => {
    Object.defineProperty(navigator, 'share', {
      value:        vi.fn().mockRejectedValue(new DOMException('AbortError')),
      configurable: true,
      writable:     true,
    })
    Object.defineProperty(navigator, 'clipboard', {
      value:        { writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
      writable:     true,
    })
    const result = await shareResult(makeData())
    expect(result).toBe('copied')
  })

  it('Web Share API 없을 때 clipboard가 copied를 반환한다', async () => {
    Object.defineProperty(navigator, 'share', {
      value:        undefined,
      configurable: true,
      writable:     true,
    })
    Object.defineProperty(navigator, 'clipboard', {
      value:        { writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
      writable:     true,
    })
    const result = await shareResult(makeData())
    expect(result).toBe('copied')
  })

  it('share도 clipboard도 불가 시 unavailable을 반환한다', async () => {
    Object.defineProperty(navigator, 'share', {
      value:        undefined,
      configurable: true,
      writable:     true,
    })
    Object.defineProperty(navigator, 'clipboard', {
      value:        { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
      configurable: true,
      writable:     true,
    })
    const result = await shareResult(makeData())
    expect(result).toBe('unavailable')
  })
})

// ── captureShareCard ─────────────────────────────────────────────

describe('captureShareCard', () => {
  let originalUA: string

  beforeEach(() => {
    originalUA = navigator.userAgent
  })

  afterEach(() => {
    Object.defineProperty(navigator, 'userAgent', {
      value: originalUA, configurable: true, writable: true,
    })
    Object.defineProperty(navigator, 'canShare', {
      value: undefined, configurable: true, writable: true,
    })
    Object.defineProperty(navigator, 'share', {
      value: undefined, configurable: true, writable: true,
    })
    vi.doUnmock('html-to-image')
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('cardEl이 null이면 manual을 반환한다', async () => {
    expect(await captureShareCard(null)).toBe('manual')
  })

  it('데스크톱: toBlob 성공 시 downloaded를 반환하고 파일명이 foodquiz-result.png다', async () => {
    const fakeBlob = new Blob(['png'], { type: 'image/png' })
    vi.doMock('html-to-image', () => ({ toBlob: vi.fn().mockResolvedValue(fakeBlob) }))
    vi.stubGlobal('URL', { ...URL, createObjectURL: vi.fn().mockReturnValue('blob:fake'), revokeObjectURL: vi.fn() })

    let downloadAttr = ''
    const fakeA = Object.assign(document.createElement('a'), { click: vi.fn() })
    Object.defineProperty(fakeA, 'download', {
      set(v: string) { downloadAttr = v },
      get() { return downloadAttr },
    })

    // el을 spy 설정 전에 생성 — mockReturnValueOnce가 내부 createElement('a')에 적용되도록
    const el = document.createElement('div')
    vi.spyOn(document, 'createElement').mockReturnValueOnce(fakeA)

    expect(await captureShareCard(el)).toBe('downloaded')
    expect(downloadAttr).toBe('foodquiz-result.png')
  })

  it('iOS + canShare(files) 지원: downloaded를 반환한다', async () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0)', configurable: true, writable: true,
    })
    const fakeBlob = new Blob(['png'], { type: 'image/png' })
    vi.doMock('html-to-image', () => ({ toBlob: vi.fn().mockResolvedValue(fakeBlob) }))
    Object.defineProperty(navigator, 'canShare', {
      value: vi.fn().mockReturnValue(true), configurable: true, writable: true,
    })
    Object.defineProperty(navigator, 'share', {
      value: vi.fn().mockResolvedValue(undefined), configurable: true, writable: true,
    })

    expect(await captureShareCard(document.createElement('div'))).toBe('downloaded')
    expect(navigator.share).toHaveBeenCalledWith(
      expect.objectContaining({ files: expect.any(Array) }),
    )
  })

  it('iOS + canShare(files) 미지원: manual을 반환한다', async () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_0)', configurable: true, writable: true,
    })
    const fakeBlob = new Blob(['png'], { type: 'image/png' })
    vi.doMock('html-to-image', () => ({ toBlob: vi.fn().mockResolvedValue(fakeBlob) }))
    Object.defineProperty(navigator, 'canShare', {
      value: vi.fn().mockReturnValue(false), configurable: true, writable: true,
    })

    expect(await captureShareCard(document.createElement('div'))).toBe('manual')
  })

  it('toBlob이 null을 반환하면 manual을 반환한다', async () => {
    vi.doMock('html-to-image', () => ({ toBlob: vi.fn().mockResolvedValue(null) }))
    expect(await captureShareCard(document.createElement('div'))).toBe('manual')
  })

  it('html-to-image import 실패 시 manual을 반환한다', async () => {
    vi.doMock('html-to-image', () => { throw new Error('load failed') })
    expect(await captureShareCard(document.createElement('div'))).toBe('manual')
  })
})

// ── shareStoryCard ────────────────────────────────────────────────

describe('shareStoryCard', () => {
  afterEach(() => {
    Object.defineProperty(navigator, 'share', {
      value:        undefined,
      configurable: true,
      writable:     true,
    })
    Object.defineProperty(navigator, 'clipboard', {
      value:        { writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
      writable:     true,
    })
  })

  it('Web Share API 사용 가능 시 shared를 반환한다', async () => {
    Object.defineProperty(navigator, 'share', {
      value:        vi.fn().mockResolvedValue(undefined),
      configurable: true,
      writable:     true,
    })
    expect(await shareStoryCard(makeData())).toBe('shared')
  })

  it('Web Share API 없을 때 clipboard fallback으로 copied를 반환한다', async () => {
    Object.defineProperty(navigator, 'share', {
      value:        undefined,
      configurable: true,
      writable:     true,
    })
    Object.defineProperty(navigator, 'clipboard', {
      value:        { writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
      writable:     true,
    })
    expect(await shareStoryCard(makeData())).toBe('copied')
  })

  it('share도 clipboard도 불가 시 unavailable을 반환한다', async () => {
    Object.defineProperty(navigator, 'share', {
      value:        undefined,
      configurable: true,
      writable:     true,
    })
    Object.defineProperty(navigator, 'clipboard', {
      value:        { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
      configurable: true,
      writable:     true,
    })
    expect(await shareStoryCard(makeData())).toBe('unavailable')
  })

  it('cardEl 인수를 받아도 동일하게 동작한다 (미래 확장 자리)', async () => {
    Object.defineProperty(navigator, 'share', {
      value:        vi.fn().mockResolvedValue(undefined),
      configurable: true,
      writable:     true,
    })
    const fakeEl = document.createElement('div')
    expect(await shareStoryCard(makeData(), fakeEl)).toBe('shared')
  })
})
