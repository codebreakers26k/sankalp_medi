import { clerkMiddleware, createRouteMatcher, clerkClient } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/sign-out(.*)',
  '/api/webhooks(.*)',
  '/backend-api/hospitals',
  '/backend-api/departments(.*)',
  '/backend-api/doctors(.*)',
  '/backend-api/health',
  '/backend-api/queue/live',
])

const isAdminRoute = createRouteMatcher(['/admin(.*)'])
const isDoctorRoute = createRouteMatcher(['/doctor(.*)'])

export default clerkMiddleware(async (auth, request) => {
  const pathname = request.nextUrl.pathname
  if (pathname.startsWith('/api/') && !pathname.startsWith('/api/webhooks/')) {
    return NextResponse.json(
      { error: 'Legacy Next.js API disabled; the application now uses the Spring Boot backend.' },
      { status: 410 },
    )
  }
  const { userId } = await auth()

  if (userId) {
    const clerk = await clerkClient()
    const user = await clerk.users.getUser(userId)
    const role = (user.publicMetadata as any)?.role as string | undefined
    if (role === 'admin' && (pathname === '/' || pathname === '/dashboard')) {
      return NextResponse.redirect(new URL('/admin', request.url))
    }
    if (role === 'doctor' && (pathname === '/' || pathname === '/dashboard')) {
      return NextResponse.redirect(new URL('/doctor', request.url))
    }
    if (isAdminRoute(request) && role !== 'admin') {
      return NextResponse.redirect(new URL('/', request.url))
    }
    if (isDoctorRoute(request) && role !== 'doctor') {
      return NextResponse.redirect(new URL('/', request.url))
    }
    return
  }

  if (isPublicRoute(request)) return
  await auth.protect()
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
