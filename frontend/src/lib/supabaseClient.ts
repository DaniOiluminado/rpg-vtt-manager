import { createBrowserClient } from '@supabase/ssr'

// Lendo as variáveis de ambiente com segurança
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// O createBrowserClient garante que a sessão seja salva nos Cookies para o Middleware ler
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)