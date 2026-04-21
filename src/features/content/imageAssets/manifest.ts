import type { ImageAssetCandidate } from './types'

/**
 * 이미지 에셋 후보 매니페스트.
 *
 * 사용 규칙:
 * - approvalStatus: 'approved' + localPath 설정된 항목만 앱에 노출됩니다
 * - sourceUrl은 참조 전용 — 앱이 외부 URL을 직접 사용하지 않습니다
 * - 파일 추가 시: public/assets/images/quiz/{category}/{filename}.{ext} 위치
 * - 거절 · 대체 항목은 삭제하지 말고 approvalStatus만 변경합니다 (히스토리 보존)
 */
export const ASSET_MANIFEST: ImageAssetCandidate[] = [

  // ── approved — 현재 앱에서 실제 사용 중 ──────────────────────────

  {
    id: 'asset_001',
    questionId: 'q08',
    displayName: '달고나 라떼 — 컵 위 달고나 크림 클로즈업',
    assetType: 'photo',
    sourceType: 'internal',
    localPath: '/assets/images/quiz/dessert_trend/dalgonaLatte_2020.jpg',
    visualKeywords: ['달고나 크림', '커피 라떼', '노란색 폼', '유리컵'],
    licenseStatus: 'owned',
    approvalStatus: 'approved',
    approvedBy: 'curator-jh',
    approvedAt: '2025-03-10',
    notes: '직접 촬영본. 2020년 코로나 홈카페 열풍 대표 이미지.',
  },
  {
    id: 'asset_002',
    questionId: 'q09',
    displayName: '탕후루 — 딸기 꼬치 길거리 판매',
    assetType: 'photo',
    sourceType: 'wikimedia',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Tanghulu_strawberry.jpg',
    localPath: '/assets/images/quiz/snack_recall/tanghulu_2023.jpg',
    visualKeywords: ['설탕 코팅 딸기', '꼬치', '길거리 간식', '반짝이는 설탕'],
    licenseStatus: 'verified-free',
    approvalStatus: 'approved',
    approvedBy: 'curator-jh',
    approvedAt: '2025-03-10',
    notes: 'Wikimedia CC0. 저작자 표시 불필요.',
  },
  {
    id: 'asset_003',
    questionId: 'q32',
    displayName: '편의점 간편식 도시락 — 2016년형',
    assetType: 'photo',
    sourceType: 'internal',
    localPath: '/assets/images/quiz/convenience_dessert/convenienceStoreLunch_2016.jpg',
    visualKeywords: ['편의점 도시락', '플라스틱 용기', '밥 반찬 구성', '전자레인지'],
    licenseStatus: 'owned',
    approvalStatus: 'approved',
    approvedBy: 'curator-jh',
    approvedAt: '2025-03-10',
  },
  {
    id: 'asset_004',
    questionId: 'q47',
    displayName: '그릭요거트 파르페 — 그래놀라 토핑',
    assetType: 'photo',
    sourceType: 'unsplash',
    sourceUrl: 'https://unsplash.com/photos/greek-yogurt-granola',
    localPath: '/assets/images/quiz/wellness_food/greekYogurt_2015.jpg',
    visualKeywords: ['흰색 요거트 볼', '그래놀라', '베리류 토핑', '브런치'],
    licenseStatus: 'verified-free',
    approvalStatus: 'approved',
    approvedBy: 'curator-jh',
    approvedAt: '2025-03-10',
    notes: 'Unsplash 무료 라이선스. 상업적 사용 가능.',
  },
  {
    id: 'asset_005',
    questionId: 'qt07',
    displayName: '흑임자 라떼 — 카페 시그니처 음료',
    assetType: 'photo',
    sourceType: 'internal',
    localPath: '/assets/images/quiz/mz_trend/heuksimja_latte.jpg',
    visualKeywords: ['검은색 라떼', '고소한 음료', '카페 잔', '검은깨 파우더'],
    licenseStatus: 'owned',
    approvalStatus: 'approved',
    approvedBy: 'curator-jh',
    approvedAt: '2025-04-01',
  },
  {
    id: 'asset_006',
    questionId: 'qt13',
    displayName: '마카롱 — 파스텔 색상 나열',
    assetType: 'photo',
    sourceType: 'unsplash',
    sourceUrl: 'https://unsplash.com/photos/colorful-macarons',
    localPath: '/assets/images/quiz/mz_trend/macaron.jpg',
    visualKeywords: ['파스텔 마카롱', '색색 줄 배열', '프랑스 디저트', '원형 샌드쿠키'],
    licenseStatus: 'verified-free',
    approvalStatus: 'approved',
    approvedBy: 'curator-jh',
    approvedAt: '2025-04-01',
  },
  {
    id: 'asset_007',
    questionId: 'qt18',
    displayName: '혼자 샤부샤부 — 1인용 냄비 세팅',
    assetType: 'photo',
    sourceType: 'internal',
    localPath: '/assets/images/quiz/mz_trend/solo_shabu.jpg',
    visualKeywords: ['1인 냄비', '샤부샤부 채소', '혼밥 식당', '인덕션 테이블'],
    licenseStatus: 'owned',
    approvalStatus: 'approved',
    approvedBy: 'curator-jh',
    approvedAt: '2025-04-01',
  },

  // ── needs-review — 검토 대기 중 ──────────────────────────────────

  {
    id: 'asset_008',
    candidateId: 'cnd_002',
    displayName: '두바이 초콜릿 — 피스타치오 카다이프 단면',
    assetType: 'photo',
    sourceType: 'sns-screencap',
    sourceUrl: 'https://www.instagram.com/p/example',
    visualKeywords: ['두바이 초콜릿 바', '피스타치오 크림', '카다이프 면', '단면 컷'],
    licenseStatus: 'unknown',
    approvalStatus: 'needs-review',
    notes: '인스타그램 스크린샷 — 라이선스 확인 필요. Unsplash 대체 이미지 탐색 권장.',
  },
  {
    id: 'asset_009',
    candidateId: 'cnd_001',
    displayName: '우베 라떼 — 보라색 카페 음료',
    assetType: 'photo',
    sourceType: 'unsplash',
    sourceUrl: 'https://unsplash.com/photos/ube-latte-purple',
    visualKeywords: ['보라색 라떼', '우베 크림', '카페 음료', '필리핀 식재료'],
    licenseStatus: 'verified-free',
    approvalStatus: 'needs-review',
    notes: 'Unsplash 라이선스 확인 완료. localPath 미설정 — 파일 다운로드 후 등록 필요.',
  },
  {
    id: 'asset_010',
    candidateId: 'cnd_008',
    displayName: '탕후루 포도 꼬치 — 야외 판매대',
    assetType: 'photo',
    sourceType: 'wikimedia',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Tanghulu_grapes.jpg',
    visualKeywords: ['포도 탕후루', '설탕 코팅', '꼬치 길거리', '야외'],
    licenseStatus: 'verified-free',
    approvalStatus: 'needs-review',
    notes: '기존 asset_002(딸기 탕후루)와 소재 중복 여부 검토 필요.',
  },

  // ── discovered — 큐레이터 검토 전 ────────────────────────────────

  {
    id: 'asset_011',
    candidateId: 'cnd_003',
    displayName: '말차쫀득쿠키 — 홈베이킹 쿠키 플레이팅',
    assetType: 'photo',
    sourceType: 'unknown',
    visualKeywords: ['녹색 쿠키', '말차 파우더', '홈베이킹', '쫀득한 텍스처'],
    licenseStatus: 'unknown',
    approvalStatus: 'discovered',
    notes: '후보 cnd_003 연결용. 적합한 무료 이미지 탐색 필요.',
  },
  {
    id: 'asset_012',
    candidateId: 'cnd_006',
    displayName: '흑임자 라떼 대안 이미지 — 오버헤드 샷',
    assetType: 'photo',
    sourceType: 'unsplash',
    visualKeywords: ['흑임자 라떼 탑뷰', '검은깨 라떼', '카페 음료 오버헤드'],
    licenseStatus: 'unknown',
    approvalStatus: 'discovered',
    notes: 'asset_005(qt07)의 앵글 대안. 두 이미지 중 한 장 선택 필요.',
  },

  // ── rejected — 사용 불가 ──────────────────────────────────────────

  {
    id: 'asset_013',
    candidateId: 'cnd_002',
    displayName: '두바이 초콜릿 — 브랜드 로고 포함 제품 사진',
    assetType: 'photo',
    sourceType: 'news-photo',
    visualKeywords: ['두바이 초콜릿 브랜드', '제품 포장'],
    licenseStatus: 'restricted',
    approvalStatus: 'rejected',
    notes: '특정 브랜드 로고 포함 → 상업적 사용 불가. asset_008로 대체 탐색 중.',
  },

  // ── replaced — 교체됨 ────────────────────────────────────────────

  {
    id: 'asset_014',
    questionId: 'q08',
    displayName: '달고나 라떼 — 초기 수집본 (저화질)',
    assetType: 'photo',
    sourceType: 'sns-screencap',
    visualKeywords: ['달고나', '커피', '홈카페'],
    licenseStatus: 'unknown',
    approvalStatus: 'replaced',
    notes: 'asset_001(직접 촬영 고화질)로 교체됨.',
  },
]
