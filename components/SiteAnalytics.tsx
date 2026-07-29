"use client"

import { Analytics, type BeforeSendEvent } from "@vercel/analytics/next"

export default function SiteAnalytics() {
  return (
    <Analytics
      beforeSend={(event: BeforeSendEvent) => {
        if (
          typeof window !== "undefined" &&
          window.localStorage.getItem("va-disable")
        ) {
          return null
        }

        return event
      }}
    />
  )
}