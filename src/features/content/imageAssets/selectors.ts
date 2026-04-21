import type { ImageAssetCandidate, AssetApprovalStatus } from './types'

// ── 핵심 필터 ─────────────────────────────────────────────────────

/** 승인 상태별 에셋 반환 */
export function getAssetsByStatus(
  manifest: ImageAssetCandidate[],
  status: AssetApprovalStatus,
): ImageAssetCandidate[] {
  return manifest.filter((a) => a.approvalStatus === status)
}

/**
 * 앱 사용 가능한 에셋만 반환.
 * approved + localPath 모두 있어야 실제 파일이 존재함을 보장합니다.
 */
export function getApprovedAssets(
  manifest: ImageAssetCandidate[],
): ImageAssetCandidate[] {
  return manifest.filter(
    (a) => a.approvalStatus === 'approved' && !!a.localPath,
  )
}

/** 큐레이터 검토가 필요한 에셋 (discovered + needs-review) */
export function getPendingAssets(
  manifest: ImageAssetCandidate[],
): ImageAssetCandidate[] {
  return manifest.filter(
    (a) => a.approvalStatus === 'discovered' || a.approvalStatus === 'needs-review',
  )
}

// ── 특정 연결 대상 조회 ──────────────────────────────────────────

/**
 * question id로 approved 에셋을 찾습니다.
 * 같은 questionId에 복수의 approved 에셋이 있으면 첫 번째를 반환합니다.
 */
export function getApprovedAssetForQuestion(
  manifest: ImageAssetCandidate[],
  questionId: string,
): ImageAssetCandidate | null {
  return (
    getApprovedAssets(manifest).find((a) => a.questionId === questionId) ?? null
  )
}

/**
 * candidate id로 approved 에셋을 찾습니다.
 * question이 아직 없는 후보 단계 이미지 조회에 사용합니다.
 */
export function getApprovedAssetForCandidate(
  manifest: ImageAssetCandidate[],
  candidateId: string,
): ImageAssetCandidate | null {
  return (
    getApprovedAssets(manifest).find((a) => a.candidateId === candidateId) ?? null
  )
}

// ── 앱 런타임 통합 ────────────────────────────────────────────────

/**
 * 매니페스트에서 ASSET_MAP을 파생합니다.
 *
 * 포함 조건:
 * - approvalStatus === 'approved'
 * - localPath 존재 (파일이 public/에 있다는 계약)
 * - questionId 존재 (quiz 화면에서 id로 조회하기 때문)
 *
 * 이 함수가 반환한 맵만 앱이 실제 이미지 URL로 사용합니다.
 * discovered / needs-review / rejected / replaced 에셋은 앱에 노출되지 않습니다.
 */
export function buildAssetMap(
  manifest: ImageAssetCandidate[],
): Record<string, string> {
  return Object.fromEntries(
    getApprovedAssets(manifest)
      .filter((a): a is ImageAssetCandidate & { questionId: string; localPath: string } =>
        !!a.questionId && !!a.localPath,
      )
      .map((a) => [a.questionId, a.localPath]),
  )
}

/**
 * visualAssetKey → localPath 맵을 파생합니다.
 *
 * questionId가 없는 approved 에셋도 visualAssetKey가 있으면 포함됩니다.
 * questionId 기반 ASSET_MAP의 보조 조회 경로로 사용됩니다.
 */
export function buildVisualKeyMap(
  manifest: ImageAssetCandidate[],
): Record<string, string> {
  return Object.fromEntries(
    getApprovedAssets(manifest)
      .filter((a): a is ImageAssetCandidate & { visualAssetKey: string; localPath: string } =>
        !!a.visualAssetKey && !!a.localPath,
      )
      .map((a) => [a.visualAssetKey, a.localPath]),
  )
}

// ── 큐레이션 유틸 ─────────────────────────────────────────────────

/** 라이선스 미확인 에셋 목록 (approved 진입 전 체크용) */
export function getUnlicensedAssets(
  manifest: ImageAssetCandidate[],
): ImageAssetCandidate[] {
  return manifest.filter(
    (a) =>
      a.licenseStatus === 'unknown' &&
      a.approvalStatus !== 'rejected' &&
      a.approvalStatus !== 'replaced',
  )
}

/** 매니페스트 전체 통계 요약 */
export function summarizeManifest(manifest: ImageAssetCandidate[]): {
  total: number
  byStatus: Record<AssetApprovalStatus, number>
  approvedWithPath: number
  pendingLicense: number
} {
  const byStatus: Record<AssetApprovalStatus, number> = {
    discovered: 0,
    'needs-review': 0,
    approved: 0,
    rejected: 0,
    replaced: 0,
  }
  for (const a of manifest) {
    byStatus[a.approvalStatus]++
  }
  return {
    total: manifest.length,
    byStatus,
    approvedWithPath: getApprovedAssets(manifest).filter((a) => !!a.questionId).length,
    pendingLicense: getUnlicensedAssets(manifest).length,
  }
}
