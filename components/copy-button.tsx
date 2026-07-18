"use client"

import { useState } from "react"
import { Check, Copy } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface CopyButtonProps {
  text: string
  label?: string
  className?: string
}

/** 通用复制按钮，真正写入剪贴板并给出反馈 */
export function CopyButton({ text, label = "复制", className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  function onCopySuccess() {
    setCopied(true)
    toast.success("已复制到剪贴板")
    setTimeout(() => setCopied(false), 1600)
  }

  /** 降级方案：创建临时 textarea + execCommand，兼容非安全上下文 / iframe 受限环境 */
  function fallbackCopy(value: string) {
    try {
      const textarea = document.createElement("textarea")
      textarea.value = value
      textarea.style.position = "fixed"
      textarea.style.opacity = "0"
      textarea.style.left = "-9999px"
      document.body.appendChild(textarea)
      textarea.focus()
      textarea.select()
      const ok = document.execCommand("copy")
      document.body.removeChild(textarea)
      if (ok) {
        onCopySuccess()
      } else {
        setCopied(false)
        toast.error("复制失败，请手动选择文本复制")
      }
    } catch {
      setCopied(false)
      toast.error("复制失败，请手动选择文本复制")
    }
  }

  function handleCopy() {
    // 方案1：优先使用 Clipboard API；任意失败均自动降级
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(onCopySuccess).catch(() => fallbackCopy(text))
    } else {
      fallbackCopy(text)
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={label}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
        copied
          ? "bg-success/15 text-success-foreground"
          : "bg-accent text-accent-foreground hover:bg-accent/70",
        className,
      )}
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      {copied ? "已复制" : label}
    </button>
  )
}
