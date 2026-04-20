export const EVENTS = {
  HOME_VIEW:             'home_view',
  QUIZ_START:            'quiz_start',
  QUESTION_ANSWERED:     'question_answered',
  QUIZ_COMPLETE:         'quiz_complete',
  RESULT_RETRY_CLICKED:  'result_retry_clicked',
} as const

export type EventName = (typeof EVENTS)[keyof typeof EVENTS]

export interface EventPayloadMap {
  home_view:            undefined
  quiz_start:           { pack_id: string }
  question_answered:    {
    question_id:    string
    category:       string
    question_type:  string
    is_correct:     boolean
  }
  quiz_complete:        {
    score:        number   // 정답 수
    total:        number
    result_type:  string   // ResultTypeId
    pack_id:      string
  }
  result_retry_clicked: undefined
}
