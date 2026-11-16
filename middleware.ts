import { clerkMiddleware, createRouteMatcher, clerkClient } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/sign-out(.*)',
  '/api/webhooks(.*)',
])

const isAdminRoute = createRouteMatcher(['/admin(.*)'])
const isDoctorRoute = createRouteMatcher(['/doctor(.*)'])

export default clerkMiddleware(async (auth, request) => {
  const { userId } = await auth()

  // Authenticated user role-based checks
  if (userId) {
    const clerk = await clerkClient()
    const user = await clerk.users.getUser(userId)
    const role = (user.publicMetadata as any)?.role as string | undefined
    const pathname = request.nextUrl.pathname

    // After-login router: redirect by role
    if (pathname === '/auth-redirect') {
      if (role === 'admin') {
        return NextResponse.redirect(new URL('/admin', request.url))
      }
      if (role === 'doctor') {
        return NextResponse.redirect(new URL('/doctor', request.url))
      }
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    // Admin should navigate directly to admin dashboard without landing page
    if (role === 'admin' && (pathname === '/' || pathname === '/dashboard')) {
      return NextResponse.redirect(new URL('/admin', request.url))
    }

    // Doctor should redirect to doctor landing page/dashboard
    if (role === 'doctor' && (pathname === '/' || pathname === '/dashboard')) {
      return NextResponse.redirect(new URL('/doctor', request.url))
    }

    // Protect admin routes from non-admins
    if (isAdminRoute(request) && role !== 'admin') {
      return NextResponse.redirect(new URL('/', request.url))
    }

    // Protect doctor routes from non-doctors
    if (isDoctorRoute(request) && role !== 'doctor') {
      return NextResponse.redirect(new URL('/', request.url))
    }

    return
  }

  // Not authenticated: allow public routes through
  if (isPublicRoute(request)) return

  // Unauthenticated user attempting to access protected route
  await auth.protect()
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
