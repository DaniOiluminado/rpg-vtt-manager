import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  // Inicializa o Supabase no servidor lendo os cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Pede para o Supabase validar se existe um usuário logado
  const { data: { user } } = await supabase.auth.getUser()

  // REGRA 1: Se tentar acessar o /painel SEM estar logado, manda pro login
  if (!user && request.nextUrl.pathname.startsWith('/painel')) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // REGRA 2: Se ESTIVER logado e tentar acessar a home (/) ou o /login, manda pro painel
  if (user && (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/')) {
    const url = request.nextUrl.clone()
    url.pathname = '/painel'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

// Configura em quais rotas o middleware deve agir (ignora imagens e arquivos estáticos)
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}