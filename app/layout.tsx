'use client';

import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { useEffect } from 'react';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'MatchPro Resume - AI-Powered Resume Optimization',
  description: 'Optimize your resume with AI-powered analysis and matching',
};

function logStyles() {
  // Log computed styles of key elements
  const body = document.body;
  const computedStyle = window.getComputedStyle(body);
  console.log('Body computed styles:', {
    backgroundColor: computedStyle.backgroundColor,
    color: computedStyle.color,
    fontFamily: computedStyle.fontFamily,
  });

  // Check if Tailwind classes are being applied
  console.log('Body classes:', body.className);
  console.log('Inter font loaded:', inter.className);
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    console.log('Layout mounted');
    logStyles();

    // Log if CSS files are loaded
    const styleSheets = document.styleSheets;
    console.log('Loaded stylesheets:', Array.from(styleSheets).map(sheet => ({
      href: sheet.href,
      rules: sheet.cssRules.length
    })));
  }, []);

  return (
    <html lang="en" className={inter.className}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body 
        className="min-h-screen bg-white antialiased"
        onLoad={() => console.log('Body loaded with classes:', document.body.className)}
      >
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </body>
    </html>
  );
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Layout Error:', error);
    console.error('Error Info:', errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-red-50 text-red-900">
          <h2 className="text-lg font-bold">Something went wrong</h2>
          <pre className="mt-2 text-sm">
            {this.state.error?.toString()}
          </pre>
        </div>
      );
    }

    return this.props.children;
  }
}
