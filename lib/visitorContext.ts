export type Audience = "patient" | "clinician"

export interface VisitorContext {
  audience: Audience
  source: string | null
  medium: string | null
  campaign: string | null
  content: string | null
  referrerHost: string | null
  landingPath: string | null
}

const AUDIENCE_STORAGE_KEY = "orthoflow-audience"

function cleanValue(value: string | null, maxLength = 80): string | null {
  if (!value) return null
  const cleaned = value.trim().replace(/[\u0000-\u001f\u007f]/g, "")
  return cleaned ? cleaned.slice(0, maxLength) : null
}

function isAudience(value: string | null): value is Audience {
  return value === "patient" || value === "clinician"
}

function readStoredAudience(): Audience | null {
  if (typeof window === "undefined") return null

  try {
    const stored = window.localStorage.getItem(AUDIENCE_STORAGE_KEY)
    return isAudience(stored) ? stored : null
  } catch {
    return null
  }
}

function readAudienceFromUrl(): Audience | null {
  if (typeof window === "undefined") return null
  const value = new URLSearchParams(window.location.search).get("audience")
  return isAudience(value) ? value : null
}

export function getInitialAudience(): Audience {
  // 患者是当前主要入口；抖音链接可以用 audience=clinician 覆盖。
  return readAudienceFromUrl() ?? readStoredAudience() ?? "patient"
}

export function setAudiencePreference(audience: Audience) {
  if (typeof window === "undefined") return

  try {
    window.localStorage.setItem(AUDIENCE_STORAGE_KEY, audience)
  } catch {
    // 隐私模式或存储空间不足时，不影响当前页面使用。
  }
}

export function getVisitorContext(preferredAudience?: Audience): VisitorContext {
  if (typeof window === "undefined") {
    return {
      audience: preferredAudience ?? "patient",
      source: null,
      medium: null,
      campaign: null,
      content: null,
      referrerHost: null,
      landingPath: null,
    }
  }

  const params = new URLSearchParams(window.location.search)
  let referrerHost: string | null = null

  try {
    referrerHost = cleanValue(
      document.referrer ? new URL(document.referrer).hostname : null,
      120,
    )
  } catch {
    referrerHost = null
  }

  return {
    audience: preferredAudience ?? readAudienceFromUrl() ?? readStoredAudience() ?? "patient",
    source: cleanValue(params.get("source") ?? params.get("utm_source")),
    medium: cleanValue(params.get("medium") ?? params.get("utm_medium")),
    campaign: cleanValue(params.get("campaign") ?? params.get("utm_campaign")),
    content: cleanValue(params.get("content") ?? params.get("utm_content")),
    referrerHost,
    landingPath: cleanValue(window.location.pathname, 200),
  }
}

export function getVisitorMetadata(preferredAudience?: Audience): Record<string, string> {
  const context = getVisitorContext(preferredAudience)

  return Object.fromEntries(
    Object.entries({
      audience: context.audience,
      source: context.source,
      medium: context.medium,
      campaign: context.campaign,
      content: context.content,
      referrerHost: context.referrerHost,
      landingPath: context.landingPath,
    }).filter(([, value]) => value !== null),
  ) as Record<string, string>
}
