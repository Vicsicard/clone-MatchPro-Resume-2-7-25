'use client';

import { useState, useEffect } from 'react';
import { ArrowRight } from 'lucide-react';
import ResumeUpload from '@/app/components/ResumeUpload';

function logComponentStyles(elementId: string, element: HTMLElement | null) {
  if (!element) {
    console.warn(`Element ${elementId} not found`);
    return;
  }

  const computedStyle = window.getComputedStyle(element);
  console.log(`${elementId} computed styles:`, {
    backgroundColor: computedStyle.backgroundColor,
    color: computedStyle.color,
    padding: computedStyle.padding,
    margin: computedStyle.margin,
    display: computedStyle.display,
    className: element.className,
  });
}

export default function Home() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    console.log('Home component mounted');

    // Log initial styles
    const header = document.querySelector('header');
    const main = document.querySelector('main');
    const h2 = document.querySelector('h2');

    logComponentStyles('header', header);
    logComponentStyles('main', main);
    logComponentStyles('h2', h2);

    // Check if Tailwind classes are being processed
    console.log('Tailwind classes on body:', document.body.className);
    
    // Log any potential CSS loading errors
    const styleSheets = document.styleSheets;
    try {
      console.log('Loaded stylesheets:', Array.from(styleSheets).map(sheet => ({
        href: sheet.href,
        rules: sheet.cssRules?.length || 0,
      })));
    } catch (error) {
      console.error('Error accessing stylesheets:', error);
    }
  }, []);

  if (!isClient) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Simple Header */}
      <header className="bg-blue-500 text-white py-4">
        <div className="container mx-auto px-4">
          <h1 className="text-2xl font-bold">MatchPro</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            AI-Powered Resume Matching
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            Upload your resume and job description to get instant feedback.
          </p>

          {/* Upload Component */}
          <ResumeUpload />

          {/* Simple CTA */}
          <div className="mt-8 text-center">
            <button 
              className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors"
              onClick={() => {
                console.log('CTA button clicked');
                const button = document.querySelector('button');
                logComponentStyles('CTA button', button);
              }}
            >
              Get Started
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
