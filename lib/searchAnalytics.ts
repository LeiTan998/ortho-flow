const SEARCH_ANALYTICS_OPTOUT_KEY = "orthoflow-search-analytics-optout";
const SEARCH_SESSION_KEY = "orthoflow-feedback-session-id";

function getSearchSessionId(): string {
  if (typeof window === "undefined") return "";
  const existing = window.sessionStorage.getItem(SEARCH_SESSION_KEY);
  if (existing) return existing;
  const created = crypto.randomUUID();
  window.sessionStorage.setItem(SEARCH_SESSION_KEY, created);
  return created;
}

export function isSearchAnalyticsOptedOut(): boolean {
  if (typeof window === "undefined") return false;

  const params = new URLSearchParams(window.location.search);
  const internal = params.get("internal");

  if (internal === "1") {
    window.localStorage.setItem(SEARCH_ANALYTICS_OPTOUT_KEY, "1");
    return true;
  }

  if (internal === "0") {
    window.localStorage.removeItem(SEARCH_ANALYTICS_OPTOUT_KEY);
    return false;
  }

  return window.localStorage.getItem(SEARCH_ANALYTICS_OPTOUT_KEY) === "1";
}

export async function logSearchClick(
  query: string,
  resultCount: number,
  clickedDiseaseId: string
) {
  if (typeof window === "undefined") return;
  if (isSearchAnalyticsOptedOut()) return;
  if (query.trim().length < 2) return;

  try {
    await fetch("/api/search-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "click",
        query: query.trim(),
        resultCount,
        clickedDiseaseId,
        pageUrl: window.location.href,
        sessionId: getSearchSessionId(),
      }),
    });
  } catch (error) {
    console.error("记录搜索点击失败:", error);
  }
}
