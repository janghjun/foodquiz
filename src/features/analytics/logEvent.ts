import type { EventName, EventPayloadMap } from './events'

// Apps in Toss SDK 등 외부 연동 시 이 타입의 핸들러를 등록
// 예: registerAnalyticsHandler((event, payload) => tossAnalytics.track(event, payload))
type ExternalHandler = (event: string, payload?: unknown) => void

let externalHandler: ExternalHandler | null = null

export function registerAnalyticsHandler(handler: ExternalHandler | null): void {
  externalHandler = handler
}

export function logEvent<E extends EventName>(
  event: E,
  payload?: EventPayloadMap[E],
): void {
  if (import.meta.env.DEV) {
    console.log(`[analytics] ${event}`, payload ?? {})
  }
  externalHandler?.(event, payload)
}
