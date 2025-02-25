'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function BlogHeader() {
  const pathname = usePathname();

  return (
    <>
      {/* Top Banner */}
      <div className="bg-[#2563eb] text-white text-[14px] py-2">
        <div className="container mx-auto px-4 max-w-[1200px]">
          <div className="flex items-center justify-center space-x-1">
            <span>New: AI-powered keyword optimization</span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <header className="bg-white border-b border-gray-200">
        <nav className="container mx-auto px-4 max-w-[1200px]">
          <div className="flex justify-between h-16 items-center">
            {/* Logo */}
            <Link href="/" className="text-xl font-bold text-gray-900">
              MatchPro Resume
            </Link>

            {/* Navigation Links */}
            <div className="hidden md:flex items-center space-x-8">
              <Link
                href="/"
                className={`text-base ${
                  pathname === '/'
                    ? 'text-blue-600 font-semibold'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Home
              </Link>
              <Link
                href="/blog"
                className={`text-base ${
                  pathname === '/blog'
                    ? 'text-blue-600 font-semibold'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Blog
              </Link>
              <Link
                href="/pricing"
                className={`text-base ${
                  pathname === '/pricing'
                    ? 'text-blue-600 font-semibold'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Pricing
              </Link>
            </div>

            {/* Auth Buttons */}
            <div className="flex items-center space-x-4">
              <Link
                href="/auth/sign-in"
                className="text-gray-600 hover:text-gray-900"
              >
                Sign in
              </Link>
              <Link
                href="/auth/sign-up"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Sign up
              </Link>
            </div>
          </div>
        </nav>
      </header>
    </>
  );
}
