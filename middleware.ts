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

export async function middleware(req: NextRequest) {
  try {
    const res = NextResponse.next();
    const supabase = createMiddlewareClient({ req, res });

    const {
      data: { session },
    } = await supabase.auth.getSession();

    // If user is not signed in and the current path is not / or /pricing,
    // redirect the user to /auth/sign-in
    if (!session && !["/", "/pricing"].includes(req.nextUrl.pathname)) {
      return NextResponse.redirect(new URL('/auth/sign-in', req.url));
    }

    // Special handling for dashboard access
    if (req.nextUrl.pathname.startsWith('/dashboard')) {
      const hasValidSubscription = await checkSubscription(req);
      
      if (!hasValidSubscription) {
        // Redirect to pricing page if no valid subscription
        return NextResponse.redirect(new URL('/pricing', req.url));
      }
    }

    return res;
  } catch (e) {
    console.error('Middleware error:', e);
    // On error, allow the request to continue
    return NextResponse.next();
  }
}
