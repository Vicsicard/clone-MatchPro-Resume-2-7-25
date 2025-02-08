'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';

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

      {/* Hero Section */}
      <div className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-5xl font-bold mb-6">
          Land Your Dream Job with<br />
          <span className="text-blue-600">AI-Optimized Resumes</span>
        </h1>
        <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
          Upload your resume, provide the job posting, and let our AI technology tailor your qualifications
          to perfectly match the position requirements.
        </p>
        <div className="flex justify-center gap-4 mb-8">
          <a 
            href="/auth/signup"
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium transition-colors shadow-lg"
          >
            Get Started Free
          </a>
          <a 
            href="/pricing"
            className="border border-gray-300 text-gray-700 hover:bg-gray-50 px-8 py-3 rounded-lg font-medium transition-colors"
          >
            View Pricing
          </a>
        </div>
        <div className="flex justify-center gap-8 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <Check className="text-green-500" size={16} />
            ATS-Friendly
          </div>
          <div className="flex items-center gap-2">
            <Check className="text-green-500" size={16} />
            GDPR-Compliant
          </div>
          <div className="flex items-center gap-2">
            <Check className="text-green-500" size={16} />
            256-bit Encrypted
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-gray-50 py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-16">Why Choose Resume Optimizer?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                title: 'AI-Powered Analysis',
                description: 'Our advanced AI analyzes your resume against job requirements for perfect matching',
                icon: (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                )
              },
              {
                title: 'ATS Optimization',
                description: 'Ensure your resume passes through Applicant Tracking Systems with ease',
                icon: (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                )
              },
              {
                title: 'Keyword Enhancement',
                description: 'Automatically identify and add missing keywords from job descriptions',
                icon: (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                )
              }
            ].map((feature, index) => (
              <div
                key={index}
                className="p-6 bg-white rounded-xl shadow-lg transform hover:-translate-y-1 transition-all"
              >
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {feature.icon}
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2 text-gray-900">
                  {feature.title}
                </h3>
                <p className="text-gray-600">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-blue-600 text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to optimize your resume?</h2>
          <p className="mb-8 max-w-2xl mx-auto text-blue-100">
            Join thousands of job seekers who have successfully landed their dream jobs using our platform
          </p>
          <a
            href="/auth/signup"
            className="bg-white text-blue-600 px-8 py-3 rounded-lg font-medium hover:bg-blue-50 transition-colors inline-block shadow-lg"
          >
            Get Started Now
          </a>
        </div>
      </div>
    </div>
  );
}
