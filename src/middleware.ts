import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { auth } from '@/auth'

const protectedPagePrefixes = ['/dashboard', '/teams']
const protectedApiPrefixes = ['/api/teams', '/api/members', '/api/invites']

export default auth((req) => {
  const { nextUrl } = req
  const pathname = nextUrl.pathname
  const isLoggedIn = !!req.auth

  const isProtectedPage = protectedPagePrefixes.some((prefix) => pathname.startsWith(prefix))
  const isProtectedApi = protectedApiPrefixes.some((prefix) => pathname.startsWith(prefix))

  if (!isLoggedIn && isProtectedApi) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!isLoggedIn && isProtectedPage) {
    const loginUrl = new URL('/login', nextUrl)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (isLoggedIn && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', nextUrl))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/dashboard/:path*', '/teams/:path*', '/api/teams/:path*', '/api/members/:path*', '/api/invites/:path*', '/login'],
}
