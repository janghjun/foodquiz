import { describe, it, expect, vi, beforeEach } from 'vitest'
import { logEvent, registerAnalyticsHandler } from './logEvent'
import { EVENTS } from './events'

beforeEach(() => {
  registerAnalyticsHandler(null) // 테스트 간 핸들러 초기화
})

describe('logEvent', () => {
  it('핸들러 없이도 에러 없이 실행된다', () => {
    expect(() => logEvent(EVENTS.HOME_VIEW)).not.toThrow()
  })

  it('등록된 핸들러에 이벤트와 payload를 전달한다', () => {
    const handler = vi.fn()
    registerAnalyticsHandler(handler)

    logEvent(EVENTS.QUIZ_START, { pack_id: 'base-pack-v1' })

    expect(handler).toHaveBeenCalledWith('quiz_start', { pack_id: 'base-pack-v1' })
  })

  it('payload 없는 이벤트도 핸들러에 전달된다', () => {
    const handler = vi.fn()
    registerAnalyticsHandler(handler)

    logEvent(EVENTS.RESULT_RETRY_CLICKED)

    expect(handler).toHaveBeenCalledWith('result_retry_clicked', undefined)
  })

  it('question_answered payload가 올바르게 전달된다', () => {
    const handler = vi.fn()
    registerAnalyticsHandler(handler)

    logEvent(EVENTS.QUESTION_ANSWERED, {
      question_id: 'q01',
      category: 'dessert_trend',
      question_type: 'menu_to_year',
      is_correct: true,
    })

    expect(handler).toHaveBeenCalledWith(
      'question_answered',
      expect.objectContaining({ question_id: 'q01', is_correct: true }),
    )
  })

  it('quiz_complete payload가 올바르게 전달된다', () => {
    const handler = vi.fn()
    registerAnalyticsHandler(handler)

    logEvent(EVENTS.QUIZ_COMPLETE, {
      score: 7,
      total: 10,
      result_type: 'dessert-sensor',
      pack_id: 'base-pack-v1',
    })

    expect(handler).toHaveBeenCalledWith(
      'quiz_complete',
      expect.objectContaining({ score: 7, result_type: 'dessert-sensor' }),
    )
  })

  it('핸들러를 교체하면 새 핸들러만 호출된다', () => {
    const first = vi.fn()
    const second = vi.fn()
    registerAnalyticsHandler(first)
    registerAnalyticsHandler(second)

    logEvent(EVENTS.HOME_VIEW)

    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledOnce()
  })
})
