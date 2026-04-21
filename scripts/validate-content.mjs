#!/usr/bin/env node
/**
 * Content validation script for seasonal pack JSON files.
 *
 * Modes:
 *   --stdin   PostToolUse hook: reads {tool_input.file_path} from stdin, validates one file
 *   --all     Stop hook: validates all src/features/content/*.json files
 *   <path>    CLI: validates the given JSON file
 */

import { readFileSync, readdirSync } from 'fs'
import { resolve, join, dirname, basename } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT      = resolve(__dirname, '..')
const CONTENT   = join(ROOT, 'src', 'features', 'content')

// ── terminal colors ───────────────────────────────────────────────

const R = '\x1b[0m'
const E = (s) => `\x1b[31m✗ ${s}${R}`   // error
const W = (s) => `\x1b[33m⚠ ${s}${R}`   // warning
const O = (s) => `\x1b[32m✓ ${s}${R}`   // ok
const H = (s) => `\x1b[1m\x1b[36m${s}${R}` // header

// ── constants (mirrors src/features/quiz/schema.ts) ──────────────

const VALID_FORMATS    = ['menu_to_year', 'year_to_menu', 'image_to_year', 'ox']
const VALID_EVIDENCE   = ['A', 'B']
const VALID_CATEGORIES = ['dessert_trend', 'snack_recall', 'convenience_dessert', 'solo_meal', 'wellness_food']
const VALID_STATUSES   = ['active', 'scheduled', 'expired']
const DATE_RE          = /^\d{4}-\d{2}-\d{2}$/
const TODAY            = new Date().toISOString().slice(0, 10)

// ── similarity helper (Jaccard on word tokens) ───────────────────

function tokenize(str) {
  return new Set(str.toLowerCase().replace(/[^\w가-힣]/g, ' ').split(/\s+/).filter(Boolean))
}

function similarity(a, b) {
  const ta = tokenize(a)
  const tb = tokenize(b)
  const inter = [...ta].filter(t => tb.has(t)).length
  const union = new Set([...ta, ...tb]).size
  return union === 0 ? 0 : inter / union
}

// ── pack JSON validation ──────────────────────────────────────────

function validatePack(filePath) {
  const name   = basename(filePath)
  const errors = []
  const warns  = []

  let pack
  try {
    pack = JSON.parse(readFileSync(filePath, 'utf-8'))
  } catch (e) {
    return { name, errors: [`JSON 파싱 실패: ${e.message}`], warns: [] }
  }

  // ── meta 검증 ────────────────────────────────────────────────

  if (!pack.packId)  errors.push('meta.packId 없음')
  if (!pack.title)   errors.push('meta.title 없음')
  if (!pack.meta)    errors.push('meta 객체 없음')

  const meta = pack.meta ?? {}

  if (!VALID_STATUSES.includes(meta.status)) {
    errors.push(`meta.status 유효하지 않음: ${meta.status}`)
  }

  if (meta.startsAt && !DATE_RE.test(meta.startsAt)) {
    errors.push(`meta.startsAt 형식 오류: ${meta.startsAt}`)
  }
  if (meta.endsAt && !DATE_RE.test(meta.endsAt)) {
    errors.push(`meta.endsAt 형식 오류: ${meta.endsAt}`)
  }

  // inactive seasonal pack 경고 (endsAt이 지났는데 status=active)
  if (meta.type === 'seasonal' && meta.status === 'active' && meta.endsAt && meta.endsAt < TODAY) {
    warns.push(`seasonal pack 만료됨 (endsAt: ${meta.endsAt}) — status를 'expired'로 변경하세요`)
  }

  // ── questions 검증 ───────────────────────────────────────────

  if (!Array.isArray(pack.questions) || pack.questions.length === 0) {
    errors.push('questions 배열이 없거나 비어있음')
    return { name, errors, warns }
  }

  const seenIds     = new Map()   // id → index
  const seenPrompts = []          // { prompt, idx }

  pack.questions.forEach((q, i) => {
    const loc = `questions[${i}] (id: ${q.id ?? '?'})`

    // schema
    if (!q.id?.trim())     errors.push(`${loc}: id 없음`)
    if (!q.prompt?.trim()) errors.push(`${loc}: prompt 없음`)
    if (!q.answer?.trim()) errors.push(`${loc}: answer 없음`)
    if (!q.explanation?.trim()) errors.push(`${loc}: explanation 없음`)

    if (!VALID_FORMATS.includes(q.format)) {
      errors.push(`${loc}: format 유효하지 않음 (${q.format})`)
    }
    if (!VALID_EVIDENCE.includes(q.evidenceLevel)) {
      errors.push(`${loc}: evidenceLevel 유효하지 않음 (${q.evidenceLevel}) — C 등급 사용 불가`)
    }
    if (!VALID_CATEGORIES.includes(q.category)) {
      errors.push(`${loc}: category 유효하지 않음 (${q.category})`)
    }

    // correctAnswer in choices
    if (Array.isArray(q.choices) && q.answer && !q.choices.includes(q.answer)) {
      errors.push(`${loc}: answer("${q.answer}")가 choices에 없음`)
    }

    // format별 필수 필드
    if (q.format === 'menu_to_year' && !q.menu) {
      errors.push(`${loc}: menu_to_year인데 menu 필드 없음`)
    }
    if (q.format === 'year_to_menu' && typeof q.year !== 'number') {
      errors.push(`${loc}: year_to_menu인데 year 필드(숫자) 없음`)
    }
    if (q.format === 'image_to_year' && !q.imageUrl) {
      errors.push(`${loc}: image_to_year인데 imageUrl 없음`)
    }
    if (q.format === 'ox') {
      if (!Array.isArray(q.choices) || q.choices[0] !== 'O' || q.choices[1] !== 'X') {
        errors.push(`${loc}: ox choices는 ["O","X"]여야 함`)
      }
    }

    // duplicate id
    if (q.id) {
      if (seenIds.has(q.id)) {
        errors.push(`${loc}: id 중복 — questions[${seenIds.get(q.id)}]와 충돌`)
      } else {
        seenIds.set(q.id, i)
      }
    }

    // duplicate prompt 유사도
    if (q.prompt) {
      for (const prev of seenPrompts) {
        const sim = similarity(q.prompt, prev.prompt)
        if (sim >= 1.0) {
          errors.push(`${loc}: prompt 완전 중복 — questions[${prev.idx}]와 동일`)
        } else if (sim >= 0.7) {
          warns.push(`${loc}: prompt 유사도 ${Math.round(sim * 100)}% — questions[${prev.idx}] "${prev.prompt.slice(0, 20)}…"`)
        }
      }
      seenPrompts.push({ prompt: q.prompt, idx: i })
    }
  })

  return { name, errors, warns }
}

// ── cross-pack duplicate id check ────────────────────────────────

function crossPackDuplicateIds(results) {
  const globalIds = new Map()   // id → packName
  const dupes     = []

  for (const { name, rawQuestions } of results) {
    for (const q of rawQuestions ?? []) {
      if (!q.id) continue
      if (globalIds.has(q.id)) {
        dupes.push(`id "${q.id}" — ${name} ↔ ${globalIds.get(q.id)}`)
      } else {
        globalIds.set(q.id, name)
      }
    }
  }
  return dupes
}

// ── target resolution ────────────────────────────────────────────

function resolveTargets(args) {
  if (args.includes('--stdin')) {
    const raw = readFileSync('/dev/stdin', 'utf-8').trim()
    if (!raw) return []
    try {
      const hook = JSON.parse(raw)
      const fp   = hook?.tool_input?.file_path ?? ''
      if (fp.endsWith('.json') && fp.includes('features/content')) {
        return [resolve(fp)]
      }
    } catch { /* not JSON stdin — ignore */ }
    return []
  }

  if (args.includes('--all') || args.length === 0) {
    return readdirSync(CONTENT)
      .filter(f => f.endsWith('.json') && !f.includes('mock'))
      .map(f => join(CONTENT, f))
  }

  return args.filter(a => !a.startsWith('--')).map(f => resolve(f))
}

// ── main ─────────────────────────────────────────────────────────

const args    = process.argv.slice(2)
const targets = resolveTargets(args)

if (targets.length === 0) {
  console.log(W('검증 대상 JSON 파일 없음 (content/*.json 확인)'))
  process.exit(0)
}

console.log(H(`\n── 콘텐츠 무결성 검증 (${new Date().toISOString().slice(0, 16)}) ──`))

// 개별 팩 검증
const packData = targets.map(fp => {
  let rawQuestions = []
  try { rawQuestions = JSON.parse(readFileSync(fp, 'utf-8')).questions ?? [] } catch { /* handled in validatePack */ }
  return { ...validatePack(fp), rawQuestions }
})

// 팩 간 id 중복 검사
const crossDupes = crossPackDuplicateIds(packData)

// ── 결과 출력 ────────────────────────────────────────────────────

let totalErrors = 0
let totalWarns  = 0

for (const { name, errors, warns } of packData) {
  const hasIssue = errors.length > 0 || warns.length > 0
  console.log(`\n${hasIssue ? '📄' : '📦'} ${name}`)
  errors.forEach(e => { console.log(`  ${E(e)}`); totalErrors++ })
  warns.forEach(w  => { console.log(`  ${W(w)}`);  totalWarns++  })
  if (!hasIssue) console.log(`  ${O('이상 없음')}`)
}

if (crossDupes.length > 0) {
  console.log(`\n📋 ${H('팩 간 id 중복')}`)
  crossDupes.forEach(d => { console.log(`  ${E(d)}`); totalErrors++ })
}

// ── 최종 요약 ────────────────────────────────────────────────────

console.log(`\n${'─'.repeat(44)}`)
if (totalErrors > 0) {
  console.log(E(`오류 ${totalErrors}건, 경고 ${totalWarns}건 — 배포 전 수정 필요`))
} else if (totalWarns > 0) {
  console.log(W(`오류 없음, 경고 ${totalWarns}건 — 확인 권장`))
} else {
  console.log(O(`모든 팩 검증 통과 (${targets.length}개 파일)`))
}
console.log('')

process.exit(0)   // 항상 0 — hook이 Claude 응답을 차단하지 않도록
