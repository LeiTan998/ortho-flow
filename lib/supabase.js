import { createClient } from '@supabase/supabase-js'

// 直接硬编码，不依赖 process.env
const supabaseUrl = 'https://fkvlrpvaqlzygzxcmbwn.supabase.co'
const supabaseAnonKey = 'sb_publishable_Fm_4Daeip636117fOOpccA_NzpaVjFE'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)