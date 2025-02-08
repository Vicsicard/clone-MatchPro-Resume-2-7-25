'use client';

import { useState, useEffect } from 'react';
import { ArrowRight, Sparkles, FileText, CheckCircle } from 'lucide-react';
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
    const header = document.querySelector('header');
    const main = document.querySelector('main');
    const h2 = document.querySelector('h2');
    logComponentStyles('header', header);
    logComponentStyles('main', main);
    logComponentStyles('h2', h2);
  }, []);

  if (!isClient) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Modern Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Sparkles className="h-6 w-6 text-blue-500" />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-500 to-blue-700 bg-clip-text text-transparent">
              MatchPro
            </h1>
          </div>
          <nav className="hidden md:flex space-x-6">
            <a href="#features" className="text-gray-600 hover:text-blue-500 transition-colors">Features</a>
            <a href="#how-it-works" className="text-gray-600 hover:text-blue-500 transition-colors">How it Works</a>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-5xl font-bold text-gray-900 mb-6 leading-tight">
              AI-Powered Resume
              <span className="bg-gradient-to-r from-blue-500 to-blue-700 bg-clip-text text-transparent"> Optimization</span>
            </h2>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Upload your resume and job description to get instant, AI-powered feedback on your match potential.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            {[
              {
                icon: <FileText className="h-6 w-6 text-blue-500" />,
                title: 'Smart Analysis',
                description: 'Advanced AI analyzes your resume against job requirements'
              },
              {
                icon: <CheckCircle className="h-6 w-6 text-green-500" />,
                title: 'Instant Results',
                description: 'Get detailed feedback and suggestions in seconds'
              },
              {
                icon: <ArrowRight className="h-6 w-6 text-purple-500" />,
                title: 'Actionable Steps',
                description: 'Clear guidance on how to improve your resume'
              }
            ].map((feature, index) => (
              <div key={index} className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                <div className="bg-gray-50 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>

          {/* Upload Component */}
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
            <ResumeUpload />
          </div>
        </div>
      </main>
    </div>
  );
}
