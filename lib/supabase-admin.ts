import "server-only"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

// 2026年优先使用新的 sb_secret_... 密钥。
// 旧项目仍可暂时使用 legacy service_role 作为兼容回退。
const serverSecretKey =
  process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl) {
  throw new Error("缺少 NEXT_PUBLIC_SUPABASE_URL 环境变量")
}

if (!serverSecretKey) {
  throw new Error(
    "缺少 SUPABASE_SECRET_KEY（或旧版 SUPABASE_SERVICE_ROLE_KEY）环境变量",
  )
}

export const supabaseAdmin = createClient(supabaseUrl, serverSecretKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})
