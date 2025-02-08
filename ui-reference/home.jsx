import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { Check } from 'lucide-react';

const Home = () => {
  const navigate = useNavigate();

  useEffect(() => {
    console.log('Home component mounted');
    return () => console.log('Home component unmounted');
  }, []);

  const handleGetStarted = () => {
    try {
      console.log('Navigating to /free-signup');
      navigate('/free-signup');
    } catch (error) {
      console.error('Navigation error:', error);
    }
  };

  const handlePricingClick = () => {
    try {
      console.log('Navigating to /pricing');
      navigate('/pricing');
    } catch (error) {
      console.error('Navigation error:', error);
    }
  };

  const handleLogin = () => {
    try {
      console.log('Navigating to /auth');
      navigate('/auth');
    } catch (error) {
      console.error('Navigation error:', error);
    }
  };

  console.log('Home component rendering');

  return (
    <div className="min-h-screen bg-white">
      {/* Announcement Banner */}
      <div className="bg-blue-50 py-2 px-4 text-center">
        <span className="inline-flex items-center">
          New: AI-powered keyword optimization <span className="ml-2">→</span>
        </span>
      </div>

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
          <Button 
            onClick={handleGetStarted}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8"
          >
            Get Started Free
          </Button>
          <Button 
            onClick={handlePricingClick}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8"
          >
            Premium Upgrade
          </Button>
          <Button
            onClick={handleLogin}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8"
          >
            Login
          </Button>
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
      <div className="container mx-auto px-4 py-20 text-center">
        <h2 className="text-3xl font-bold mb-16">Why Choose Resume Optimizer?</h2>
        <div className="text-center mb-20">
          <p className="text-xl mb-4">Join thousands of successful job seekers who've landed their dream jobs</p>
        </div>
        <div className="grid md:grid-cols-3 gap-12 max-w-4xl mx-auto mb-20">
          <div className="text-center">
            <div className="bg-blue-600 text-white w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="font-semibold mb-2">AI-Powered Optimization</h3>
            <p className="text-blue-600 font-medium mb-2">90% match rate</p>
            <p className="text-gray-600">Our advanced AI tailors your resume to match job requirements perfectly</p>
          </div>
          <div className="text-center">
            <div className="bg-blue-600 text-white w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </div>
            <h3 className="font-semibold mb-2">Easy Upload Process</h3>
            <p className="text-blue-600 font-medium mb-2">2-min process</p>
            <p className="text-gray-600">Simply upload your resume and provide the job posting URL</p>
          </div>
          <div className="text-center">
            <div className="bg-blue-600 text-white w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <h3 className="font-semibold mb-2">Increased Success Rate</h3>
            <p className="text-blue-600 font-medium mb-2">3x more interviews</p>
            <p className="text-gray-600">Boost your interview chances with perfectly matched qualifications</p>
          </div>
        </div>

        {/* Additional Benefits */}
        <div className="bg-blue-50 rounded-lg p-8 max-w-4xl mx-auto mb-20">
          <h3 className="font-bold mb-6">Additional Benefits</h3>
          <div className="grid md:grid-cols-2 gap-4 text-left">
            <div className="flex items-center gap-2">
              <Check className="text-green-500" size={16} />
              <span>Keyword optimization for ATS systems</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="text-green-500" size={16} />
              <span>Real-time analysis and suggestions</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="text-green-500" size={16} />
              <span>Professional formatting templates</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="text-green-500" size={16} />
              <span>Industry-specific recommendations</span>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-blue-600 text-white rounded-lg p-12 max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-4">Ready to boost your career?</h2>
          <h3 className="text-2xl font-bold mb-4">Start optimizing your resume today.</h3>
          <p className="mb-8">
            Join thousands of successful job seekers who have improved their chances with MatchPro Resume.
          </p>
          <Button 
            onClick={handleGetStarted}
            className="bg-black text-white hover:bg-white hover:text-black transition-colors duration-200 px-8"
          >
            Upload Your Resume →
          </Button>
        </div>
      </div>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 text-center">
        <div className="flex justify-center space-x-6 mb-4">
          <Link to="/about" className="text-gray-600 hover:text-blue-600">About</Link>
          <Link to="/features" className="text-gray-600 hover:text-blue-600">Features</Link>
          <Link to="/pricing" className="text-gray-600 hover:text-blue-600">Pricing</Link>
          <Link to="/blog" className="text-gray-600 hover:text-blue-600">Blog</Link>
          <Link to="/contact" className="text-gray-600 hover:text-blue-600">Contact</Link>
        </div>
        <div className="text-gray-600">
          2024 MatchPro Resume. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default Home;