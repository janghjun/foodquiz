#!/usr/bin/env node
/**
 * generate-draft-pack.mjs
 *
 * candidate registry → seasonal pack JSON draft 자동 생성기.
 * Claude Code slash command(/season-pack-generator)의 독립 실행 버전.
 *
 * 사용법:
 *   node scripts/generate-draft-pack.mjs <pack-id> [시즌레이블] [startsAt] [endsAt]
 *
 * 예시:
 *   node scripts/generate-draft-pack.mjs mz-2026-q3 "MZ 트렌드팩 2026 Q3" 2026-07-01 2026-09-30
 *   node scripts/generate-draft-pack.mjs   # 기본값으로 실행
 *
 * 출력: src/features/content/<pack-id>.draft.json
 *   - status: "scheduled"  (배포 전 수동으로 "active"로 변경)
 *   - _draft 키: 검토 메타데이터 (배포 전 삭제)
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

// ── 인수 파싱 ──────────────────────────────────────────────────────

const [,, rawPackId, rawTitle, rawStartsAt, rawEndsAt] = process.argv

const today = new Date().toISOString().slice(0, 10)
const ninetyDaysLater = new Date(Date.now() + 90 * 86_400_000).toISOString().slice(0, 10)

const packId   = rawPackId   ?? 'new-season-pack'
const title    = rawTitle    ?? '새 시즌팩'
const startsAt = rawStartsAt ?? today
const endsAt   = rawEndsAt   ?? ninetyDaysLater

// ── 카테고리 매핑 ─────────────────────────────────────────────────

const CATEGORY_MAP = {
  dessert:     'dessert_trend',
  snack:       'snack_recall',
  convenience: 'convenience_dessert',
  meal:        'solo_meal',
  wellness:    'wellness_food',
  drink:       'dessert_trend',
}

// ── 레지스트리 파싱 ────────────────────────────────────────────────
// TypeScript 파일을 텍스트로 읽어 배열 리터럴만 추출한 뒤 eval.
// 개발자 전용 스크립트 — 레지스트리 파일 구조가 고정적임을 전제.

function parseRegistry() {
  const src = readFileSync(
    join(ROOT, 'src/features/content/candidates/registry.ts'),
    'utf8',
  )

  const match = src.match(/CANDIDATE_REGISTRY[^=]*=\s*(\[[\s\S]*\])/)
  if (!match) throw new Error('CANDIDATE_REGISTRY 배열을 찾을 수 없습니다')

  const arrayStr = match[1]
    .replace(/\/\*[\s\S]*?\*\//g, '')  // 블록 주석 제거
    .replace(/\/\/.*/g, '')            // 라인 주석 제거

  // eslint-disable-next-line no-eval
  return (0, eval)(`(${arrayStr})`)
}

// ── 기존 팩 프롬프트 수집 (중복 방지) ────────────────────────────

function collectExistingPrompts() {
  const dir = join(ROOT, 'src/features/content')
  const prompts = new Set()

  for (const f of readdirSync(dir)) {
    if (!f.endsWith('.json')) continue
    try {
      const pack = JSON.parse(readFileSync(join(dir, f), 'utf8'))
      for (const q of pack.questions ?? []) {
        if (typeof q.prompt === 'string') prompts.add(q.prompt)
      }
    } catch { /* 파싱 실패는 무시 */ }
  }

  return prompts
}

// ── eligible 후보 필터 ─────────────────────────────────────────────

const ELIGIBLE_STATUSES = new Set(['rising', 'active', 'peak'])

function isEligible(c) {
  if (c.evidenceLevel === 'C') return false
  if (!ELIGIBLE_STATUSES.has(c.trendStatus)) return false
  if (c.questionReady === true) return true
  if (c.questionReady === false) return false
  return c.evidenceLevel === 'A' && c.peakStartAt != null
}

// ── 후보 선택 (5~10개, 카테고리 균형) ─────────────────────────────

function selectCandidates(registry) {
  const STATUS_ORDER = { rising: 0, active: 1, peak: 2 }

  const eligible = registry
    .filter(isEligible)
    .sort((a, b) => {
      const pa = STATUS_ORDER[a.trendStatus] ?? 9
      const pb = STATUS_ORDER[b.trendStatus] ?? 9
      if (pa !== pb) return pa - pb
      return b.firstSeenAt.localeCompare(a.firstSeenAt)
    })

  const catCount = {}
  const selected = []

  for (const c of eligible) {
    if (selected.length >= 10) break
    const n = catCount[c.category] ?? 0
    if (n >= 3) continue
    catCount[c.category] = n + 1
    selected.push(c)
  }

  if (selected.length === 0) {
    throw new Error(
      'eligible candidate가 없습니다. ' +
      'registry에서 questionReady: true 또는 evidenceLevel A + peakStartAt 있는 항목을 확인하세요.',
    )
  }

  return selected
}

// ── 조사 처리 ─────────────────────────────────────────────────────

function hasTerminalConsonant(str) {
  const code = str.charCodeAt(str.length - 1)
  if (code < 0xAC00 || code > 0xD7A3) return false
  return (code - 0xAC00) % 28 !== 0
}

const eunNun = (s) => hasTerminalConsonant(s) ? '은' : '는'
const iGa    = (s) => hasTerminalConsonant(s) ? '이' : '가'

// ── 연도 선택지 생성 ───────────────────────────────────────────────

function makeYearChoices(peakYear) {
  const base = [peakYear - 2, peakYear - 1, peakYear, peakYear + 1]
  // 결정론적 shuffle — 같은 입력에 항상 같은 결과
  let seed = peakYear
  const arr = [...base]
  for (let i = arr.length - 1; i > 0; i--) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    const j = seed % (i + 1)
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  const choices = arr.map((y) => `${y}년`)
  const answer = `${peakYear}년`
  if (!choices.includes(answer)) choices[0] = answer
  return choices
}

// ── Jaccard 유사도 (중복 감지) ────────────────────────────────────
// 기존 팩 프롬프트에만 적용. 같은 포맷 템플릿 토큰은 제거 후 비교.

// menu_to_year/year_to_menu/image_to_year 문항에 공통으로 등장하는 템플릿 단어 제거
const TEMPLATE_STOPWORDS = new Set([
  '가장', '크게', '유행한', '해는', '유행했을까', '핫했던', '메뉴는',
  '이', '가', '은', '는', '이가', '가장', '국내', '언제',
])

function tokenize(str) {
  return new Set(
    str.replace(/[^\w가-힣]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length >= 2 && !TEMPLATE_STOPWORDS.has(t)),
  )
}

function jaccard(a, b) {
  const sa = tokenize(a)
  const sb = tokenize(b)
  if (sa.size === 0 || sb.size === 0) return 0
  let inter = 0
  for (const t of sa) if (sb.has(t)) inter++
  return inter / (sa.size + sb.size - inter)
}

function isDuplicate(prompt, existingPackPrompts) {
  for (const p of existingPackPrompts) {
    if (jaccard(prompt, p) >= 0.6) return true
  }
  return false
}

// ── explanation 초안 ──────────────────────────────────────────────

function makeExplanation(c, peakYear) {
  const ctx = {
    rising:    'SNS에서 빠르게 확산되며',
    active:    '카페·편의점으로 퍼지며',
    peak:      '전국적으로 유행하며',
    declining: '정점을 찍으며',
  }[c.trendStatus] ?? '화제가 되며'

  return `${c.name}${eunNun(c.name)} ${peakYear}년 ${ctx} MZ세대 필수 먹거리로 자리잡았어요.`
}

// ── 문항 생성 함수 ────────────────────────────────────────────────

function makeMenuToYear(c, id, peakYear, choices, answer, existingPackPrompts, draftPrompts) {
  const prompt = `${c.name}${iGa(c.name)} 가장 크게 유행한 해는?`
  if (isDuplicate(prompt, existingPackPrompts)) return null
  if (draftPrompts.has(prompt)) return null
  draftPrompts.add(prompt)

  return {
    id,
    format: 'menu_to_year',
    category: CATEGORY_MAP[c.category] ?? 'dessert_trend',
    prompt,
    menu: c.name,
    choices,
    answer,
    explanation: makeExplanation(c, peakYear),
    evidenceLevel: c.evidenceLevel,
    difficulty: 'medium',
    tags: c.tags.slice(0, 4),
  }
}

function makeOx(c, id, peakYear) {
  const prompt = `${c.name}의 국내 트렌드 피크는 ${peakYear}년이다`
  return {
    id,
    format: 'ox',
    category: CATEGORY_MAP[c.category] ?? 'dessert_trend',
    prompt,
    choices: ['O', 'X'],
    answer: 'O',
    explanation: `${c.name}${eunNun(c.name)} ${peakYear}년 편의점·카페를 중심으로 가장 큰 관심을 받았어요.`,
    evidenceLevel: c.evidenceLevel,
    difficulty: 'easy',
    tags: c.tags.slice(0, 4),
  }
}

function makeYearToMenu(c, id, peakYear, allCandidates) {
  // 정답 외 3개: 다른 후보 이름에서 무작위 선택
  const pool = allCandidates
    .filter((x) => x.id !== c.id)
    .map((x) => x.name)

  // 결정론적 shuffle
  let seed = peakYear + c.name.charCodeAt(0)
  const shuffled = [...pool]
  for (let i = shuffled.length - 1; i > 0; i--) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    const j = seed % (i + 1)
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }

  const distractors = shuffled.slice(0, 3)
  while (distractors.length < 3) distractors.push(`메뉴 ${distractors.length + 1}`)

  // choices 순서도 shuffle
  const raw = [c.name, ...distractors]
  seed += 7
  for (let i = raw.length - 1; i > 0; i--) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    const j = seed % (i + 1)
    ;[raw[i], raw[j]] = [raw[j], raw[i]]
  }

  return {
    id,
    format: 'year_to_menu',
    category: CATEGORY_MAP[c.category] ?? 'dessert_trend',
    prompt: `${peakYear}년 가장 핫했던 메뉴는?`,
    year: peakYear,
    choices: raw,
    answer: c.name,
    explanation: makeExplanation(c, peakYear),
    evidenceLevel: c.evidenceLevel,
    difficulty: 'hard',
    tags: c.tags.slice(0, 4),
  }
}

function makeImageToYear(c, id, choices, answer, peakYear) {
  const cat = CATEGORY_MAP[c.category] ?? 'dessert_trend'
  // 이미지 에셋이 없을 때 placeholder 경로 사용 — 앱이 정상 동작함
  const imageUrl = `/assets/images/placeholder/${cat}.svg`

  return {
    id,
    format: 'image_to_year',
    category: cat,
    prompt: `이 ${c.name}, 언제 가장 유행했을까?`,
    imageUrl,   // ← 큐레이터가 실제 에셋으로 교체 (placeholder도 동작)
    choices,
    answer,
    explanation: makeExplanation(c, peakYear),
    evidenceLevel: c.evidenceLevel,
    difficulty: 'medium',
    tags: c.tags.slice(0, 4),
  }
}

// ── format 분포 결정 ──────────────────────────────────────────────
// 전체 문항 기준 목표: menu_to_year 40~50%, year_to_menu 25~35%, ox 15~25%, image_to_year 0~15%

function pickSecondFormat(c, tracker, totalSoFar) {
  const t = totalSoFar + 1 || 1
  const oxRatio    = tracker.ox / t
  const imageRatio = tracker.image_to_year / t
  const ytyRatio   = tracker.year_to_menu / t

  if (oxRatio < 0.15) return 'ox'
  if (imageRatio < 0.10 && (c.visualKeywords ?? []).length >= 2) return 'image_to_year'
  if (ytyRatio < 0.25) return 'year_to_menu'
  return 'ox'
}

// ── 후보 → 문항 묶음 생성 ─────────────────────────────────────────

function generateForCandidate(c, allCandidates, prefix, idx, existingPackPrompts, draftPrompts, tracker) {
  const peakYear = parseInt(
    (c.peakStartAt ?? c.firstSeenAt).slice(0, 4),
    10,
  )
  const choices = makeYearChoices(peakYear)
  const answer  = `${peakYear}년`

  const questions = []
  const totalSoFar = Object.values(tracker).reduce((a, b) => a + b, 0)

  // 문항 1: menu_to_year (기본)
  const q1Id = `${prefix}_q${String(idx).padStart(3, '0')}`
  const q1 = makeMenuToYear(c, q1Id, peakYear, choices, answer, existingPackPrompts, draftPrompts)
  if (q1) {
    questions.push(q1)
    tracker.menu_to_year++
  }

  // 문항 2: 분포 기반 선택
  const fmt2 = pickSecondFormat(c, tracker, totalSoFar + questions.length)
  const q2Id = `${prefix}_q${String(idx + questions.length).padStart(3, '0')}`

  switch (fmt2) {
    case 'ox':
      questions.push(makeOx(c, q2Id, peakYear))
      tracker.ox++
      break
    case 'image_to_year':
      questions.push(makeImageToYear(c, q2Id, choices, answer, peakYear))
      tracker.image_to_year++
      break
    case 'year_to_menu':
    default:
      questions.push(makeYearToMenu(c, q2Id, peakYear, allCandidates))
      tracker.year_to_menu++
      break
  }

  return questions
}

// ── 검토 체크리스트 생성 ──────────────────────────────────────────

function buildChecklist(questions, selectedCandidates) {
  const evidenceBIds = questions
    .filter((q) => q.evidenceLevel === 'B')
    .map((q) => q.id)

  const ytyWithPlaceholder = questions
    .filter((q) => q.format === 'year_to_menu' &&
      q.choices.some((c) => c.startsWith('메뉴 ')))
    .map((q) => q.id)

  const imageIds = questions
    .filter((q) => q.format === 'image_to_year')
    .map((q) => q.id)

  return [
    '## 필수 검토',
    ...evidenceBIds.length > 0
      ? [`- [ ] evidenceLevel B 문항의 answer 근거 재확인: ${evidenceBIds.join(', ')}`]
      : ['- [x] evidenceLevel B 문항 없음'],
    ...ytyWithPlaceholder.length > 0
      ? [`- [ ] year_to_menu choices "메뉴 N" 플레이스홀더를 실제 메뉴명으로 교체: ${ytyWithPlaceholder.join(', ')}`]
      : ['- [x] year_to_menu choices 정상'],
    ...imageIds.length > 0
      ? [`- [ ] image_to_year imageUrl을 실제 에셋으로 교체 (또는 placeholder 유지 결정): ${imageIds.join(', ')}`]
      : [],
    '',
    '## 콘텐츠 검토',
    '- [ ] 모든 explanation이 1문장이고 해요체(~요)로 끝나는가',
    '- [ ] 모든 prompt가 30자 이내인가',
    '- [ ] 기존 팩과 의미 중복인 prompt가 없는가',
    '',
    '## 기술 검토',
    '- [ ] 모든 answer가 choices 안에 정확히 포함되는가',
    '- [ ] meta.status가 "scheduled"인가',
    '- [ ] npx vitest run 통과 확인',
    '',
    '## 배포 전 작업',
    `- [ ] 파일명 ${packId}.draft.json → ${packId}.json 으로 변경`,
    '- [ ] _draft 키 삭제',
    '- [ ] meta.status를 "active"로 변경',
    `- [ ] src/features/content/index.ts에 import rawPack from './${packId}.json' 추가`,
    '- [ ] buildPackFromRaw() 호출 후 ALL_SEASONAL에 추가',
  ]
}

// ── 메인 ─────────────────────────────────────────────────────────

function main() {
  const registry        = parseRegistry()
  const existingPrompts = collectExistingPrompts()
  const selected        = selectCandidates(registry)

  const prefix  = packId.replace(/[^a-z0-9]/gi, '').slice(0, 4).toLowerCase()
  const tracker = { menu_to_year: 0, year_to_menu: 0, ox: 0, image_to_year: 0 }

  const allQuestions = []
  const draftPrompts = new Set()  // 이번 draft 내 신규 prompt 중복 방지
  let idx = 1

  for (const c of selected) {
    const qs = generateForCandidate(c, registry, prefix, idx, existingPrompts, draftPrompts, tracker)
    allQuestions.push(...qs)
    idx += qs.length
  }

  const categories = [...new Set(allQuestions.map((q) => q.category))]
  const checklist  = buildChecklist(allQuestions, selected)

  const draft = {
    packId,
    title,
    meta: {
      packId,
      title,
      subtitle: `${selected.slice(0, 3).map((c) => c.name).join('·')} 등 최신 트렌드`,
      type: 'seasonal',
      isSeasonal: true,
      startsAt,
      endsAt,
      categories,
      status: 'scheduled',
    },
    _draft: {
      generatedAt:   today,
      scriptVersion: '1.0.0',
      candidatesUsed: selected.map((c) => ({
        id:            c.id,
        name:          c.name,
        trendStatus:   c.trendStatus,
        evidenceLevel: c.evidenceLevel,
        peakStartAt:   c.peakStartAt ?? null,
      })),
      formatDistribution: tracker,
      totalQuestions: allQuestions.length,
      reviewChecklist: checklist,
      note: '배포 전 이 _draft 키 전체를 삭제하세요.',
    },
    questions: allQuestions,
  }

  const outPath = join(ROOT, `src/features/content/${packId}.draft.json`)
  writeFileSync(outPath, JSON.stringify(draft, null, 2) + '\n', 'utf8')

  // ── 결과 출력 ────────────────────────────────────────────────────

  const total = allQuestions.length
  const bItems = allQuestions.filter((q) => q.evidenceLevel === 'B').map((q) => q.id)

  console.log(`\n✅  Draft 생성 완료`)
  console.log(`    파일: src/features/content/${packId}.draft.json`)
  console.log(`    후보: ${selected.map((c) => c.name).join(', ')}`)
  console.log(`    총 문항: ${total}개`)
  console.log(
    `    format: menu_to_year ${tracker.menu_to_year} / ` +
    `year_to_menu ${tracker.year_to_menu} / ` +
    `ox ${tracker.ox} / ` +
    `image_to_year ${tracker.image_to_year}`,
  )

  if (bItems.length > 0) {
    console.log(`\n⚠️   evidenceLevel B 문항 (answer 근거 재확인 필요): ${bItems.join(', ')}`)
  }

  const ytyPlaceholders = allQuestions.filter(
    (q) => q.format === 'year_to_menu' && q.choices.some((c) => c.startsWith('메뉴 ')),
  )
  if (ytyPlaceholders.length > 0) {
    console.log(`⚠️   year_to_menu choices 교체 필요: ${ytyPlaceholders.map((q) => q.id).join(', ')}`)
  }

  console.log(`\n📋  다음 단계:`)
  console.log(`    1. _draft.reviewChecklist 항목 확인`)
  console.log(`    2. 검토 완료 → ${packId}.json으로 이름 변경 + _draft 삭제`)
  console.log(`    3. src/features/content/index.ts에 팩 등록`)
  console.log(`    4. npx vitest run 으로 회귀 테스트 확인\n`)
}

main()
