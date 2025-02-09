'use client';

import { createClient } from '@/app/supabase/client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import ResumeUpload from '@/app/components/ResumeUpload';

export default function Dashboard() {
  const [session, setSession] = useState<any>(null);
  const [files, setFiles] = useState<{
    resume?: File;
    jobDescription?: File;
  }>({});
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/auth/sign-in');
      } else {
        setSession(session);
      }
    };

    checkSession();
  }, []);

  const handleFileUpload = (type: 'resume' | 'jobDescription', file: File) => {
    setFiles(prev => ({
      ...prev,
      [type]: file
    }));
  };

  const handleAnalysis = async () => {
    if (!files.resume || !files.jobDescription) {
      return;
    }

    const formData = new FormData();
    formData.append('resume', files.resume);
    formData.append('jobDescription', files.jobDescription);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to analyze files');
      }

      const data = await response.json();
      console.log('Analysis started:', data);
      // Handle success (e.g., show success message, redirect to results page)
    } catch (error) {
      console.error('Analysis error:', error);
      // Handle error (e.g., show error message)
    }
  };

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white shadow-sm rounded-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Welcome to your Dashboard</h1>
          <p className="text-gray-600 mb-4">
            You are signed in as: {session.user.email}
          </p>
          
          <div className="space-y-8">
            {/* Upload Section */}
            <div className="bg-gray-50 p-6 rounded-lg">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Upload Documents</h2>
              
              <div className="grid md:grid-cols-2 gap-6">
                {/* Resume Upload */}
                <div className="bg-white p-6 rounded-lg border border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Upload Resume</h3>
                  <ResumeUpload 
                    type="resume"
                    onFileUpload={(file) => handleFileUpload('resume', file)}
                  />
                </div>

                {/* Job Description Upload */}
                <div className="bg-white p-6 rounded-lg border border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Upload Job Description</h3>
                  <ResumeUpload 
                    type="jobDescription"
                    onFileUpload={(file) => handleFileUpload('jobDescription', file)}
                  />
                </div>
              </div>

              {/* Analysis Button */}
              {files.resume && files.jobDescription && (
                <div className="mt-6 flex justify-center">
                  <button
                    onClick={handleAnalysis}
                    className="bg-blue-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                  >
                    Start Analysis
                  </button>
                </div>
              )}
            </div>
            
            {/* Recent Activity */}
            <div className="bg-gray-50 p-6 rounded-lg">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Activity</h2>
              <p className="text-gray-600">No recent activity to display.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
