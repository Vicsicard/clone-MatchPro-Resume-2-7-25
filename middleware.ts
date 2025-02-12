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
     * - api routes
     */
    '/((?!_next/static|_next/image|favicon.ico|public/|auth/|api/).*)',
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

export async function middleware(req: NextRequest) {
  try {
    const res = NextResponse.next();
    const supabase = createMiddlewareClient({ req, res });

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const pathname = req.nextUrl.pathname;

    // Allow public routes and any route starting with /blog
    if (PUBLIC_ROUTES.includes(pathname) || pathname.startsWith('/blog/')) {
      return res;
    }

    // If not signed in, redirect to sign in
    if (!session) {
      return NextResponse.redirect(new URL('/auth/sign-in', req.url));
    }

    // Special handling for dashboard access
    if (pathname.startsWith('/dashboard')) {
      const hasValidSubscription = await checkSubscription(req);
      
      if (!hasValidSubscription) {
        // Redirect to pricing page if no valid subscription
        return NextResponse.redirect(new URL('/pricing', req.url));
      }
    }

    return res;
  } catch (error) {
    console.error('Middleware error:', error);
    return NextResponse.redirect(new URL('/auth/sign-in', req.url));
  }
}
