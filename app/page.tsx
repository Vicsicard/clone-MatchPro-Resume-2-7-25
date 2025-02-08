'use client';

import { useState } from 'react';
import { ArrowRight, CheckCircle, Zap, Target, LineChart } from 'lucide-react';
import ResumeUpload from '@/app/components/ResumeUpload';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Announcement Banner */}
      <div className="bg-blue-600 text-white py-2 px-4">
        <div className="container mx-auto text-center text-sm font-medium flex items-center justify-center gap-2">
          <Zap size={16} className="animate-pulse" />
          <span>New: AI-powered keyword optimization</span>
          <ArrowRight size={16} />
        </div>
      </div>

      {/* Navigation */}
      <nav className="border-b border-gray-100 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
              MatchPro
            </span>
            <div className="hidden md:flex space-x-6">
              <a href="#features" className="text-gray-600 hover:text-gray-900 transition-colors">Features</a>
              <a href="#pricing" className="text-gray-600 hover:text-gray-900 transition-colors">Pricing</a>
              <a href="#about" className="text-gray-600 hover:text-gray-900 transition-colors">About</a>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button className="text-gray-600 hover:text-gray-900 transition-colors">
              Sign in
            </button>
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors">
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto pt-16 pb-24 text-center">
          <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-gray-900 via-blue-800 to-blue-600 bg-clip-text text-transparent">
            Land Your Dream Job with<br />
            AI-Powered Resume Matching
          </h1>
          <p className="text-gray-600 text-lg mb-12 max-w-2xl mx-auto">
            Upload your resume and job description to get instant feedback. Our AI analyzes keywords, 
            skills, and experience to optimize your application for success.
          </p>

          {/* Upload Component */}
          <ResumeUpload />

          {/* Trust Indicators */}
          <div className="mt-12 flex justify-center gap-8 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <CheckCircle size={16} className="text-green-500" />
              <span>ATS-Friendly Format</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle size={16} className="text-green-500" />
              <span>GDPR Compliant</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle size={16} className="text-green-500" />
              <span>256-bit Encryption</span>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="py-24 border-t border-gray-100">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-16">Why Choose MatchPro?</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <FeatureCard 
                icon={<Zap className="w-6 h-6 text-blue-600" />}
                title="AI-Powered Analysis"
                description="Our advanced AI analyzes your resume against job requirements for perfect matching"
              />
              <FeatureCard 
                icon={<Target className="w-6 h-6 text-blue-600" />}
                title="ATS Optimization"
                description="Ensure your resume passes through Applicant Tracking Systems with ease"
              />
              <FeatureCard 
                icon={<LineChart className="w-6 h-6 text-blue-600" />}
                title="Keyword Enhancement"
                description="Automatically identify and add missing keywords from job descriptions"
              />
            </div>
          </div>
        </div>
      </main>

      {/* CTA Section */}
      <section className="bg-blue-600 text-white py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to optimize your resume?</h2>
          <p className="mb-8 text-blue-100 max-w-2xl mx-auto">
            Join thousands of job seekers who have successfully landed their dream jobs using our platform.
          </p>
          <button className="bg-white text-blue-600 px-8 py-3 rounded-lg font-medium hover:bg-blue-50 transition-colors">
            Get Started Now
          </button>
        </div>
      </section>
    </div>
  )
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-100">
      <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="text-xl font-semibold mb-2 text-gray-900">
        {title}
      </h3>
      <p className="text-gray-600">
        {description}
      </p>
    </div>
  )
}
