import { createClient } from '@supabase/supabase-js'

declare const process: {
	env: {
		NEXT_PUBLIC_SUPABASE_URL?: string
		NEXT_PUBLIC_SUPABASE_ANON_KEY?: string
	}
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)