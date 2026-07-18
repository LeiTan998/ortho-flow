import { Analytics } from "@vercel/analytics/next"
import type { Metadata, Viewport } from "next"
import { Geist } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "sonner"
import "./globals.css"

const geist = Geist({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "OrthoFlow · 骨科轮转工作助手",
  description:
    "OrthoFlow 是为骨科轮转医生打造的移动端工作与学习助手：Checklist、Workflow、病历模板、医嘱助手、临床知识一站式速查。",
  applicationName: "OrthoFlow",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "OrthoFlow",
  },
  generator: "v0.app",
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#28282e" },
  ],
}

// 避免暗色模式闪烁：在页面渲染前同步应用主题
const themeInitScript = `
(function() {
  try {
    var t = localStorage.getItem('orthoflow-theme');
    if (t === 'dark') document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN" className="bg-background" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className={`${geist.className} antialiased`}>
        <ThemeProvider>{children}</ThemeProvider>
        <Toaster position="top-center" richColors />
        {process.env.NODE_ENV === "production" && <Analytics />}
      </body>
    </html>
  )
}
