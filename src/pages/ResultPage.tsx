import { useMemo, useEffect } from 'react'
import { buildQuizResult } from '../features/result'
import type { CategoryStat, QuizResult } from '../features/result'
import type { QuizSession } from '../features/quiz'
import { logEvent, EVENTS } from '../features/analytics'
import { mockPack } from '../features/content'
import './ResultPage.css'

interface Props {
  session: QuizSession
  onRestart: () => void
}

const CATEGORY_LABEL: Record<string, string> = {
  dessert_trend:       '디저트 트렌드',
  snack_recall:        '추억 간식',
  convenience_dessert: '편의점 디저트',
  solo_meal:           '혼밥 문화',
  wellness_food:       '건강식 트렌드',
}

function safeCalc(session: QuizSession): QuizResult | null {
  try {
    return buildQuizResult(session)
  } catch {
    return null
  }
}

export default function ResultPage({ session, onRestart }: Props) {
  const result = useMemo(() => safeCalc(session), [session])

  useEffect(() => {
    if (!result) return
    logEvent(EVENTS.QUIZ_COMPLETE, {
      score:       result.score.correct,
      total:       result.score.total,
      result_type: result.resultType.id,
      pack_id:     mockPack.packId,
    })
  }, [result])

  if (!result) {
    return (
      <div className="result-screen result-screen--center">
        <p className="result-status-text">결과를 계산하지 못했어요</p>
        <button className="result-cta-btn" onClick={onRestart}>다시 해볼래요</button>
      </div>
    )
  }

  const { score, categoryStats, resultType } = result

  // 문항이 있는 카테고리만 추출 후 적중률 내림차순 정렬
  const activeCats = (Object.entries(categoryStats) as [string, CategoryStat][])
    .filter(([, s]) => s.total > 0)
    .sort(([, a], [, b]) => b.rate - a.rate)

  const strongCat = activeCats[0] ?? null
  const weakCat = activeCats.length > 1 ? activeCats[activeCats.length - 1] : null
  const showWeak = weakCat !== null && weakCat[1].rate < (strongCat?.[1].rate ?? 1)

  // 오답 복습 최대 3개
  const wrongQuestions = session.questions
    .filter((q) => {
      const s = session.answers[q.id]
      return s !== undefined && s !== q.answer
    })
    .slice(0, 3)

  return (
    <main className="result-screen">
      {/* 결과 타입 — 가장 먼저 */}
      <div className="result-type-card">
        <span className="result-type-name">{resultType.label}</span>
        <p className="result-type-desc">{resultType.description}</p>
      </div>

      {/* 점수 */}
      <div className="result-score-section">
        <p className="result-score-text">
          {score.total}문제 중 <strong>{score.correct}문제</strong> 맞혔어요
        </p>
        <div className="result-score-bar">
          <div
            className="result-score-fill"
            style={{ width: `${Math.round(score.rate * 100)}%` }}
          />
        </div>
      </div>

      {/* 카테고리 강약 */}
      {activeCats.length > 0 && (
        <div className="result-category-section">
          <p className="result-section-label">카테고리별 성적</p>

          {strongCat && (
            <div className="result-category-row">
              <span className="result-category-tag result-category-tag--strong">강해요</span>
              <span className="result-category-name">
                {CATEGORY_LABEL[strongCat[0]] ?? strongCat[0]}
              </span>
              <span className="result-category-rate">
                {Math.round(strongCat[1].rate * 100)}%
              </span>
            </div>
          )}

          {showWeak && weakCat && (
            <div className="result-category-row">
              <span className="result-category-tag result-category-tag--weak">약해요</span>
              <span className="result-category-name">
                {CATEGORY_LABEL[weakCat[0]] ?? weakCat[0]}
              </span>
              <span className="result-category-rate">
                {Math.round(weakCat[1].rate * 100)}%
              </span>
            </div>
          )}
        </div>
      )}

      {/* 오답 복습 */}
      {wrongQuestions.length > 0 && (
        <div className="result-review-section">
          <p className="result-section-label">오답 복습</p>
          {wrongQuestions.map((q) => (
            <div key={q.id} className="result-review-item">
              <p className="result-review-prompt">{q.prompt}</p>
              <p className="result-review-answer">정답: {q.answer}</p>
            </div>
          ))}
        </div>
      )}

      {/* 다시 하기 */}
      <button
        className="result-cta-btn"
        onClick={() => {
          logEvent(EVENTS.RESULT_RETRY_CLICKED)
          onRestart()
        }}
      >
        다시 해볼래요
      </button>
    </main>
  )
}
