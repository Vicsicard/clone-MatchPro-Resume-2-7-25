import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { checkSubscription } from './app/middleware/subscription';

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - auth routes
     */
    '/((?!_next/static|_next/image|favicon.ico|public/|auth/).*)',
  ],
};

// Public routes that don't require authentication
const PUBLIC_ROUTES = [
  '/', 
  '/pricing', 
  '/blog', 
  '/about',
  '/privacy',
  '/terms'
];

// API routes that don't require subscription check
const PUBLIC_API_ROUTES = [
  '/api/auth',
  '/api/start-trial',
  '/api/create-checkout-session',
  '/api/webhook',
  '/api/health'
];

export async function middleware(req: NextRequest) {
  try {
    const res = NextResponse.next();
    const supabase = createMiddlewareClient({ req, res });
    const pathname = req.nextUrl.pathname;

    // Skip middleware for public routes
    if (PUBLIC_ROUTES.includes(pathname) || pathname.startsWith('/blog/')) {
      return res;
    }

    // Skip middleware for public API routes
    if (PUBLIC_API_ROUTES.some(route => pathname.startsWith(route))) {
      return res;
    }

    // Get user session
    const {
      data: { session },
    } = await supabase.auth.getSession();

    // If not signed in and not on an auth route, redirect to sign in
    if (!session && !pathname.startsWith('/auth/')) {
      const redirectUrl = new URL('/auth/sign-in', req.url);
      redirectUrl.searchParams.set('redirectTo', pathname);
      return NextResponse.redirect(redirectUrl);
    }

    // Skip subscription check for auth routes and public routes
    if (!session || pathname.startsWith('/auth/') || PUBLIC_ROUTES.includes(pathname)) {
      return res;
    }

    // Check subscription for protected routes
    const hasValidSubscription = await checkSubscription(session.user.id);
    console.log('Subscription check for', pathname, ':', hasValidSubscription);
    
    if (!hasValidSubscription && pathname !== '/pricing') {
      return NextResponse.redirect(new URL('/pricing', req.url));
    }

    return res;
  } catch (error) {
    console.error('Middleware error:', error);
    // On error, allow the request to continue
    return NextResponse.next();
  }
}
