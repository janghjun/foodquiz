import { useEffect, useMemo } from 'react'
import { mockPack, activeSeasonMeta } from '../features/content'
import type { MenuToYearQuestion } from '../features/quiz'
import { logEvent, EVENTS } from '../features/analytics'
import { getLastRecord } from '../features/history'
import { RESULT_TYPES } from '../features/result'
import { loadUserQuizState, getUserStats } from '../features/state/userQuizState'
import './HomePage.css'

const CATEGORY_LABEL: Record<string, string> = {
  dessert_trend:       '디저트 트렌드',
  snack_recall:        '추억 간식',
  convenience_dessert: '편의점 디저트',
  solo_meal:           '혼밥 문화',
  wellness_food:       '건강식 트렌드',
}

interface Props {
  onStart: () => void
  onStartDaily: () => void
}

export default function HomePage({ onStart, onStartDaily }: Props) {
  useEffect(() => { logEvent(EVENTS.HOME_VIEW) }, [])
  const lastRecord = useMemo(() => getLastRecord(), [])
  const stats      = useMemo(() => getUserStats(loadUserQuizState(), mockPack.questions), [])

  // 팩이 비어있으면 에러 화면 — 로컬 JSON이므로 실제로는 발생하지 않음
  if (mockPack.questions.length === 0) {
    return (
      <div className="home-screen home-screen--center">
        <p className="home-status-body">문제를 불러오지 못했어요</p>
      </div>
    )
  }

  // 예시 문제: 팩의 첫 번째 menu_to_year 문항으로 고정
  const exampleQ = mockPack.questions.find((q) => q.format === 'menu_to_year') as MenuToYearQuestion

  return (
    <main className="home-screen">
      <span className="home-badge">
        {activeSeasonMeta ? activeSeasonMeta.subtitle : (mockPack.meta?.subtitle ?? '2000 — 2020년대')}
      </span>

      <h1 className="home-title">그때그메뉴</h1>
      <p className="home-desc">그 메뉴, 그 과자, 그 디저트가 언제 유행했는지 맞혀봐요</p>
      <p className="home-meta">10문제 · 1분</p>

      {lastRecord && (
        <p className="home-last-record">
          최근 결과: {RESULT_TYPES[lastRecord.resultType as keyof typeof RESULT_TYPES]?.label ?? lastRecord.resultType}
          {' '}·{' '}
          {lastRecord.correctCount}/{lastRecord.totalCount}점
        </p>
      )}

      {stats.totalPlays >= 2 && (
        <div className="home-stats">
          <span className="home-stats-item">총 {stats.totalPlays}번 플레이</span>
          {stats.bestScore !== null && (
            <span className="home-stats-item">최고 {Math.round(stats.bestScore * 100)}%</span>
          )}
          {stats.weakestCategory && (
            <span className="home-stats-item home-stats-item--weak">
              취약 {CATEGORY_LABEL[stats.weakestCategory] ?? stats.weakestCategory}
            </span>
          )}
        </div>
      )}

      <div className="home-example-card">
        <span className="home-example-label">예시 문제</span>
        <p className="home-example-prompt">{exampleQ.prompt}</p>
        <div className="home-example-choices">
          {exampleQ.choices.map((choice) => (
            <span key={choice} className="home-example-choice">{choice}</span>
          ))}
        </div>
      </div>

      {/* 오늘의 퀴즈 카드 */}
      <button
        className="home-daily-card"
        onClick={() => {
          logEvent(EVENTS.QUIZ_START, { pack_id: `${mockPack.packId}__daily` })
          onStartDaily()
        }}
      >
        <div className="home-daily-info">
          <span className="home-daily-title">오늘의 퀴즈</span>
          <span className="home-daily-meta">3문제 · 매일 새로 나와요</span>
        </div>
        <span className="home-daily-arrow">›</span>
      </button>

      <button
        className="home-cta"
        onClick={() => {
          logEvent(EVENTS.QUIZ_START, { pack_id: mockPack.packId })
          onStart()
        }}
      >
        시작해요
      </button>
    </main>
  )
}
