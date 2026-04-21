// ── 승인 상태 ─────────────────────────────────────────────────────

/**
 * 에셋 큐레이션 파이프라인 단계.
 * 앱에 실제 사용되는 에셋은 반드시 'approved'여야 합니다.
 *
 * 전이 규칙:
 *   discovered → needs-review → approved | rejected
 *   approved   → replaced  (더 나은 이미지로 대체 시)
 */
export type AssetApprovalStatus =
  | 'discovered'    // 발견됨, 아직 검토 전
  | 'needs-review'  // 큐레이터 검토 요청됨
  | 'approved'      // 승인 완료 — 앱 사용 가능
  | 'rejected'      // 거절 (품질·라이선스 문제)
  | 'replaced'      // 더 나은 에셋으로 교체됨 (히스토리 보존)

// ── 라이선스 상태 ─────────────────────────────────────────────────

export type AssetLicenseStatus =
  | 'unknown'            // 아직 확인 안 됨
  | 'verified-free'      // 무료 사용 확인 (CC0, Unsplash 무료, Wikimedia Commons 등)
  | 'needs-attribution'  // 저작자 표시 필요 (CC-BY 등)
  | 'restricted'         // 상업적 사용 불가 또는 재배포 금지
  | 'owned'              // 직접 촬영 · 제작 (완전 소유)

// ── 출처 유형 ─────────────────────────────────────────────────────

export type AssetSourceType =
  | 'unsplash'       // Unsplash API (무료 상업 라이선스)
  | 'wikimedia'      // Wikimedia Commons
  | 'sns-screencap'  // SNS 스크린샷 (라이선스 확인 필수)
  | 'news-photo'     // 뉴스 기사 사진 (라이선스 확인 필수)
  | 'internal'       // 직접 촬영·제작
  | 'stock'          // 유료 스톡 (Getty, Shutterstock 등)
  | 'unknown'        // 출처 미상

// ── 에셋 파일 유형 ────────────────────────────────────────────────

export type AssetFileType =
  | 'photo'          // 실제 사진
  | 'illustration'   // 일러스트·그래픽
  | 'placeholder'    // 임시 placeholder (카테고리 색 SVG)

// ── 이미지 소스 해석 결과 ─────────────────────────────────────────

export type ImageSourceKind =
  | 'approved'             // ASSET_MAP에 등록된 approved 로컬 파일
  | 'category-placeholder' // 카테고리 SVG placeholder
  | 'default-placeholder'  // 기본 SVG placeholder

export interface ResolvedImageSource {
  kind: ImageSourceKind
  /** 항상 로컬 경로. 외부 URL 절대 포함 금지. */
  src: string
}

// ── 핵심 인터페이스 ──────────────────────────────────────────────

export interface ImageAssetCandidate {
  /** 고유 식별자 (asset_xxx 형식 권장) */
  id: string

  /**
   * 연결된 quiz question id (e.g., 'qt07').
   * approved 상태에서 localPath가 있으면 ASSET_MAP에 포함됩니다.
   */
  questionId?: string

  /**
   * 연결된 food candidate id (e.g., 'cnd_001').
   * question이 아직 없는 후보용 이미지에 사용합니다.
   */
  candidateId?: string

  /**
   * visualAssetKey (e.g., 'dalgonaLatte_2020').
   * question.visualAssetKey와 매칭되어 VISUAL_KEY_MAP에 포함됩니다.
   */
  visualAssetKey?: string

  /** 사람이 읽는 표시명 (큐레이터용) */
  displayName: string

  /** 에셋 파일 유형 */
  assetType: AssetFileType

  /** 이미지 출처 유형 */
  sourceType: AssetSourceType

  /**
   * 원본 이미지 URL.
   * 참조 용도만 — 앱이 직접 fetch하거나 자동 다운로드하지 않습니다.
   */
  sourceUrl?: string

  /**
   * public/ 기준 로컬 파일 경로.
   * 예: '/assets/images/quiz/dessert_trend/dalgonaLatte_2020.jpg'
   * approved 상태에서만 설정하며, 파일이 실제 존재해야 합니다.
   */
  localPath?: string

  /** 이미지 검색 · AI 생성 프롬프트용 시각 키워드 */
  visualKeywords: string[]

  /** 라이선스 상태 — approved 전에 반드시 'verified-free' 또는 'owned' 확인 */
  licenseStatus: AssetLicenseStatus

  /** 큐레이션 파이프라인 상태 */
  approvalStatus: AssetApprovalStatus

  /** 승인한 큐레이터 이름 (approved 시 기입) */
  approvedBy?: string

  /** 승인 날짜 (YYYY-MM-DD) */
  approvedAt?: string

  /** 큐레이터 메모 (거절 이유, 대체 이유, 저작자 표시 문구 등) */
  notes?: string
}
