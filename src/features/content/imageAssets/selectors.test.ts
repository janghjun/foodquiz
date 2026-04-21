import { describe, it, expect } from 'vitest'
import {
  getApprovedAssets,
  getPendingAssets,
  getAssetsByStatus,
  getApprovedAssetForQuestion,
  getApprovedAssetForCandidate,
  buildAssetMap,
  getUnlicensedAssets,
  summarizeManifest,
} from './selectors'
import { ASSET_MANIFEST } from './manifest'
import type { ImageAssetCandidate } from './types'

// ── 픽스처 ──────────────────────────────────────────────────────

function makeAsset(overrides: Partial<ImageAssetCandidate> = {}): ImageAssetCandidate {
  return {
    id: 'asset_test',
    displayName: '테스트 에셋',
    assetType: 'photo',
    sourceType: 'internal',
    visualKeywords: ['테스트'],
    licenseStatus: 'owned',
    approvalStatus: 'approved',
    localPath: '/assets/images/quiz/test/test.jpg',
    questionId: 'q_test',
    ...overrides,
  }
}

// ── ASSET_MANIFEST 무결성 ─────────────────────────────────────

describe('ASSET_MANIFEST 무결성', () => {
  it('비어있지 않다', () => {
    expect(ASSET_MANIFEST.length).toBeGreaterThan(0)
  })

  it('모든 id가 유일하다', () => {
    const ids = ASSET_MANIFEST.map((a) => a.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('approved 항목은 모두 localPath를 가진다', () => {
    const approved = ASSET_MANIFEST.filter((a) => a.approvalStatus === 'approved')
    const withoutPath = approved.filter((a) => !a.localPath)
    expect(withoutPath).toHaveLength(0)
  })

  it('approved 항목은 licenseStatus가 unknown이 아니다', () => {
    const approved = ASSET_MANIFEST.filter((a) => a.approvalStatus === 'approved')
    const unknownLicense = approved.filter((a) => a.licenseStatus === 'unknown')
    expect(unknownLicense).toHaveLength(0)
  })

  it('discovered/needs-review 항목은 localPath가 없다', () => {
    const pending = ASSET_MANIFEST.filter(
      (a) => a.approvalStatus === 'discovered' || a.approvalStatus === 'needs-review',
    )
    const withPath = pending.filter((a) => !!a.localPath)
    expect(withPath).toHaveLength(0)
  })
})

// ── getApprovedAssets ─────────────────────────────────────────

describe('getApprovedAssets', () => {
  it('approved + localPath 있는 항목만 반환한다', () => {
    const result = getApprovedAssets(ASSET_MANIFEST)
    expect(result.every((a) => a.approvalStatus === 'approved' && !!a.localPath)).toBe(true)
  })

  it('빈 배열 입력 시 빈 배열 반환', () => {
    expect(getApprovedAssets([])).toHaveLength(0)
  })

  it('localPath 없는 approved 항목은 제외된다', () => {
    const manifest = [
      makeAsset({ approvalStatus: 'approved', localPath: '/path/img.jpg' }),
      makeAsset({ id: 'asset_no_path', approvalStatus: 'approved', localPath: undefined }),
    ]
    expect(getApprovedAssets(manifest)).toHaveLength(1)
  })
})

// ── getPendingAssets ──────────────────────────────────────────

describe('getPendingAssets', () => {
  it('discovered와 needs-review를 모두 반환한다', () => {
    const result = getPendingAssets(ASSET_MANIFEST)
    expect(
      result.every(
        (a) => a.approvalStatus === 'discovered' || a.approvalStatus === 'needs-review',
      ),
    ).toBe(true)
    expect(result.length).toBeGreaterThan(0)
  })

  it('approved, rejected, replaced는 포함하지 않는다', () => {
    const manifest = [
      makeAsset({ approvalStatus: 'approved' }),
      makeAsset({ id: 'a2', approvalStatus: 'rejected', localPath: undefined }),
      makeAsset({ id: 'a3', approvalStatus: 'discovered', localPath: undefined }),
    ]
    const result = getPendingAssets(manifest)
    expect(result).toHaveLength(1)
    expect(result[0].approvalStatus).toBe('discovered')
  })
})

// ── getAssetsByStatus ─────────────────────────────────────────

describe('getAssetsByStatus', () => {
  it('지정된 status만 반환한다', () => {
    const rejected = getAssetsByStatus(ASSET_MANIFEST, 'rejected')
    expect(rejected.every((a) => a.approvalStatus === 'rejected')).toBe(true)
    expect(rejected.length).toBeGreaterThan(0)
  })

  it('해당 status 없으면 빈 배열 반환', () => {
    const manifest = [makeAsset({ approvalStatus: 'approved' })]
    expect(getAssetsByStatus(manifest, 'rejected')).toHaveLength(0)
  })
})

// ── getApprovedAssetForQuestion ───────────────────────────────

describe('getApprovedAssetForQuestion', () => {
  it('questionId로 approved 에셋을 찾는다', () => {
    const result = getApprovedAssetForQuestion(ASSET_MANIFEST, 'q08')
    expect(result).not.toBeNull()
    expect(result?.questionId).toBe('q08')
    expect(result?.approvalStatus).toBe('approved')
  })

  it('존재하지 않는 questionId면 null 반환', () => {
    expect(getApprovedAssetForQuestion(ASSET_MANIFEST, 'q_nonexistent')).toBeNull()
  })

  it('needs-review 에셋은 반환하지 않는다', () => {
    const manifest = [
      makeAsset({
        id: 'nr',
        questionId: 'q99',
        approvalStatus: 'needs-review',
        localPath: undefined,
      }),
    ]
    expect(getApprovedAssetForQuestion(manifest, 'q99')).toBeNull()
  })
})

// ── getApprovedAssetForCandidate ──────────────────────────────

describe('getApprovedAssetForCandidate', () => {
  it('candidateId로 approved 에셋을 찾는다', () => {
    // ASSET_MANIFEST에 candidateId 연결된 approved 항목이 없으므로 직접 픽스처 생성
    const manifest = [
      makeAsset({ id: 'ca1', candidateId: 'cnd_001', questionId: undefined }),
    ]
    const result = getApprovedAssetForCandidate(manifest, 'cnd_001')
    expect(result?.candidateId).toBe('cnd_001')
  })

  it('존재하지 않는 candidateId면 null 반환', () => {
    expect(getApprovedAssetForCandidate(ASSET_MANIFEST, 'cnd_999')).toBeNull()
  })
})

// ── buildAssetMap ─────────────────────────────────────────────

describe('buildAssetMap', () => {
  it('approved + localPath + questionId 항목만 맵에 포함된다', () => {
    const map = buildAssetMap(ASSET_MANIFEST)
    // 기존 ASSET_MAP에 있던 7개 항목이 모두 포함되어야 함
    expect(map['q08']).toBeDefined()
    expect(map['qt07']).toBeDefined()
    expect(map['qt13']).toBeDefined()
  })

  it('needs-review 에셋은 맵에 포함되지 않는다', () => {
    const manifest = [
      makeAsset({ id: 'nr', questionId: 'q_nr', approvalStatus: 'needs-review', localPath: undefined }),
    ]
    const map = buildAssetMap(manifest)
    expect(map['q_nr']).toBeUndefined()
  })

  it('questionId 없는 approved 항목은 맵에 포함되지 않는다', () => {
    const manifest = [
      makeAsset({ id: 'no_qid', questionId: undefined, candidateId: 'cnd_001' }),
    ]
    const map = buildAssetMap(manifest)
    expect(Object.keys(map)).toHaveLength(0)
  })

  it('맵의 값이 localPath와 일치한다', () => {
    const manifest = [makeAsset()]
    const map = buildAssetMap(manifest)
    expect(map['q_test']).toBe('/assets/images/quiz/test/test.jpg')
  })

  it('빈 배열이면 빈 맵 반환', () => {
    expect(buildAssetMap([])).toEqual({})
  })
})

// ── getUnlicensedAssets ───────────────────────────────────────

describe('getUnlicensedAssets', () => {
  it('licenseStatus unknown이면서 active 상태인 항목을 반환한다', () => {
    const result = getUnlicensedAssets(ASSET_MANIFEST)
    expect(result.every((a) => a.licenseStatus === 'unknown')).toBe(true)
    expect(result.every((a) => a.approvalStatus !== 'rejected' && a.approvalStatus !== 'replaced')).toBe(true)
  })
})

// ── summarizeManifest ─────────────────────────────────────────

describe('summarizeManifest', () => {
  it('total이 매니페스트 길이와 같다', () => {
    const summary = summarizeManifest(ASSET_MANIFEST)
    expect(summary.total).toBe(ASSET_MANIFEST.length)
  })

  it('byStatus 합계가 total과 같다', () => {
    const summary = summarizeManifest(ASSET_MANIFEST)
    const statusSum = Object.values(summary.byStatus).reduce((a, b) => a + b, 0)
    expect(statusSum).toBe(summary.total)
  })

  it('approvedWithPath는 questionId가 있는 approved 에셋 수와 같다', () => {
    const summary = summarizeManifest(ASSET_MANIFEST)
    const manual = ASSET_MANIFEST.filter(
      (a) => a.approvalStatus === 'approved' && !!a.localPath && !!a.questionId,
    ).length
    expect(summary.approvedWithPath).toBe(manual)
  })
})
