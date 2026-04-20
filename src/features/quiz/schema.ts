import type { Question, QuestionFormat, EvidenceLevel, QuestionCategory } from './types'

const VALID_FORMATS: QuestionFormat[] = ['menu_to_year', 'year_to_menu', 'image_to_year', 'ox']
const VALID_EVIDENCE: EvidenceLevel[] = ['A', 'B']
const VALID_CATEGORIES: QuestionCategory[] = [
  'dessert_trend', 'snack_recall', 'convenience_dessert', 'solo_meal', 'wellness_food',
]

export type ValidationResult =
  | { ok: true; question: Question }
  | { ok: false; errors: string[] }

export function validateQuestion(data: unknown): ValidationResult {
  const errors: string[] = []

  if (typeof data !== 'object' || data === null) {
    return { ok: false, errors: ['데이터가 객체가 아닙니다'] }
  }

  const d = data as Record<string, unknown>

  if (typeof d.id !== 'string' || d.id.trim() === '') errors.push('id가 없습니다')
  if (typeof d.prompt !== 'string' || d.prompt.trim() === '') errors.push('prompt가 없습니다')
  if (typeof d.answer !== 'string' || d.answer.trim() === '') errors.push('answer가 없습니다')
  if (typeof d.explanation !== 'string' || d.explanation.trim() === '') errors.push('explanation이 없습니다')

  if (!VALID_FORMATS.includes(d.format as QuestionFormat)) {
    errors.push(`format이 유효하지 않습니다: ${d.format}`)
  }

  if (!VALID_EVIDENCE.includes(d.evidenceLevel as EvidenceLevel)) {
    errors.push(`evidenceLevel이 유효하지 않습니다: ${d.evidenceLevel} (C 등급 문항 사용 불가)`)
  }

  if (!VALID_CATEGORIES.includes(d.category as QuestionCategory)) {
    errors.push(`category가 유효하지 않습니다: ${d.category}`)
  }

  const format = d.format as QuestionFormat

  if (format === 'menu_to_year') {
    if (typeof d.menu !== 'string') errors.push('menu_to_year: menu가 없습니다')
    if (!validateChoices(d.choices, d.answer)) errors.push('menu_to_year: choices가 유효하지 않거나 answer가 포함되지 않습니다')
  }

  if (format === 'year_to_menu') {
    if (typeof d.year !== 'number') errors.push('year_to_menu: year가 숫자가 아닙니다')
    if (!validateChoices(d.choices, d.answer)) errors.push('year_to_menu: choices가 유효하지 않거나 answer가 포함되지 않습니다')
  }

  if (format === 'image_to_year') {
    if (typeof d.imageUrl !== 'string') errors.push('image_to_year: imageUrl이 없습니다')
    if (!validateChoices(d.choices, d.answer)) errors.push('image_to_year: choices가 유효하지 않거나 answer가 포함되지 않습니다')
  }

  if (format === 'ox') {
    const choices = d.choices
    if (!Array.isArray(choices) || choices[0] !== 'O' || choices[1] !== 'X') {
      errors.push('ox: choices는 ["O", "X"]여야 합니다')
    }
    if (d.answer !== 'O' && d.answer !== 'X') {
      errors.push('ox: answer는 "O" 또는 "X"여야 합니다')
    }
  }

  if (errors.length > 0) return { ok: false, errors }
  return { ok: true, question: data as Question }
}

function validateChoices(choices: unknown, answer: unknown): boolean {
  return (
    Array.isArray(choices) &&
    choices.length >= 2 &&
    choices.every((c) => typeof c === 'string') &&
    typeof answer === 'string' &&
    choices.includes(answer)
  )
}
