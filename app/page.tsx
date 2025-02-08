'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';
import ResumeUpload from '@/app/components/ResumeUpload';

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Announcement Banner */}
      <div className="bg-blue-50 py-2 px-4 text-center">
        <span className="inline-flex items-center">
          New: AI-powered keyword optimization <span className="ml-2">→</span>
        </span>
      </div>

      {/* Navigation Bar */}
      <nav className="border-b border-gray-200 py-4">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <div className="flex items-center space-x-8">
            <span className="text-xl font-semibold text-gray-900">
              MatchPro Resume
            </span>
            <div className="hidden md:flex space-x-6">
              <a href="#features" className="text-gray-600 hover:text-gray-900">Features</a>
              <a href="#pricing" className="text-gray-600 hover:text-gray-900">Pricing</a>
              <a href="#about" className="text-gray-600 hover:text-gray-900">About</a>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <a href="/auth/login" className="text-gray-600 hover:text-gray-900">Sign in</a>
            <a href="/auth/signup" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 shadow-md">
              Get Started
            </a>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-20">
        <h1 className="text-5xl font-bold mb-6 text-center">
          Land Your Dream Job with<br />
          <span className="text-blue-600">AI-Optimized Resumes</span>
        </h1>
        <p className="text-gray-600 mb-12 text-center max-w-2xl mx-auto">
          Upload your resume and job description to get instant feedback on how well they match.
          Our AI will analyze keywords, skills, and experience to help you optimize your application.
        </p>
        
        <ResumeUpload />
      </main>
    </div>
  )
}
