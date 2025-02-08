'use client';

import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import ResumeUpload from '@/app/components/ResumeUpload';

export default function Home() {
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
            <button className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors">
              Get Started
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
