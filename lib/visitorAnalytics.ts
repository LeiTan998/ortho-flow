import { track } from "@vercel/analytics"
import { isSearchAnalyticsOptedOut } from "@/lib/searchAnalytics"
import {
  getVisitorMetadata,
  type Audience,
} from "@/lib/visitorContext"

type EventValue = string | number | boolean | null

export function trackVisitorEvent(
  name: string,
  audience: Audience,
  properties: Record<string, EventValue> = {},
) {
  if (typeof window === "undefined") return
  if (isSearchAnalyticsOptedOut()) return

  try {
    if (window.localStorage.getItem("va-disable")) return
  } catch {
    // 存储不可用时继续发送不含身份信息的匿名事件。
  }

  track(name, {
    ...getVisitorMetadata(audience),
    ...properties,
  })
}
