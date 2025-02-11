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
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [analysisStatus, setAnalysisStatus] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  const router = useRouter();
  const supabase = createClient();

  // Poll for analysis status
  useEffect(() => {
    if (!analysisId) return;

    const pollInterval = setInterval(async () => {
      try {
        const { data: analysis, error } = await supabase
          .from('analyses')
          .select('*')
          .eq('id', analysisId)
          .single();

        if (error) {
          console.error('Error fetching analysis:', error);
          setError('Failed to fetch analysis status');
          clearInterval(pollInterval);
          return;
        }

        if (analysis) {
          setAnalysisStatus(analysis.status);
          if (analysis.results) {
            setAnalysisResult(analysis.results);
          }

          if (analysis.status === 'completed' || analysis.status === 'failed') {
            clearInterval(pollInterval);
            if (analysis.status === 'failed') {
              setError('Analysis failed. Please try again.');
            }
          }
        }
      } catch (error) {
        console.error('Error polling analysis status:', error);
        setError('Failed to check analysis status');
        clearInterval(pollInterval);
      }
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(pollInterval);
  }, [analysisId]);

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
    setError(null);
    setAnalysisId(null);
    setAnalysisStatus(null);
    setAnalysisResult(null);
  };

  const handleAnalysis = async () => {
    if (!files.resume || !files.jobDescription) {
      setError('Please upload both resume and job description');
      return;
    }

    setLoading(true);
    setError(null);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('resume', files.resume);
      formData.append('jobDescription', files.jobDescription);

      // Create a timeout to handle hanging requests
      const timeoutId = setTimeout(() => {
        setError('Request timed out. Please try again.');
        setLoading(false);
      }, 30000); // 30 second timeout

      const response = await fetch('/api/analyze', {
        method: 'POST',
        body: formData
      });

      clearTimeout(timeoutId);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze files');
      }

      setAnalysisId(data.analysisId);
      setAnalysisStatus('processing');
      setFiles({});
      setUploadProgress(100);
    } catch (error: any) {
      console.error('Analysis error:', error);
      setError(error.message || 'Failed to analyze files');
      setAnalysisId(null);
      setAnalysisStatus(null);
    } finally {
      setLoading(false);
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
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Resume Analysis Dashboard</h1>
          
          {/* Upload Section */}
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Resume Upload */}
              <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Upload Resume</h3>
                <ResumeUpload 
                  onFileSelect={(file) => handleFileUpload('resume', file)}
                  accept=".pdf,.doc,.docx"
                  file={files.resume}
                  disabled={loading}
                />
              </div>

              {/* Job Description Upload */}
              <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Upload Job Description</h3>
                <ResumeUpload 
                  onFileSelect={(file) => handleFileUpload('jobDescription', file)}
                  accept=".pdf,.doc,.docx"
                  file={files.jobDescription}
                  disabled={loading}
                />
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Upload Progress */}
            {loading && (
              <div className="relative pt-1">
                <div className="flex mb-2 items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-blue-600 bg-blue-200">
                      Progress
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-semibold inline-block text-blue-600">
                      {uploadProgress}%
                    </span>
                  </div>
                </div>
                <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-blue-200">
                  <div
                    style={{ width: `${uploadProgress}%` }}
                    className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500 transition-all duration-500"
                  />
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-center">
              <button
                onClick={handleAnalysis}
                disabled={loading || !files.resume || !files.jobDescription}
                className={`px-6 py-3 rounded-md text-white font-medium ${
                  loading || !files.resume || !files.jobDescription
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {loading ? 'Processing...' : 'Start Analysis'}
              </button>
            </div>
          </div>

          {/* Analysis Status and Results */}
          {analysisId && (
            <div className="mt-8 space-y-6">
              {/* Status */}
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Analysis Status</h2>
                <div className="flex items-center space-x-2" data-testid="analysis-status">
                  {analysisStatus === 'processing' && (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
                      <p className="text-gray-600">Processing your documents...</p>
                    </>
                  )}
                  {analysisStatus === 'completed' && (
                    <>
                      <svg className="h-5 w-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                      <p className="text-gray-600">Analysis completed!</p>
                    </>
                  )}
                  {analysisStatus === 'failed' && (
                    <>
                      <svg className="h-5 w-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <p className="text-red-600">Analysis failed. Please try again.</p>
                    </>
                  )}
                </div>
              </div>

              {/* Results */}
              {analysisResult && (
                <div className="bg-white p-6 rounded-lg border border-gray-200" data-testid="analysis-results">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Analysis Results</h2>
                  <pre className="bg-gray-50 p-4 rounded-lg overflow-auto max-h-96">
                    {JSON.stringify(analysisResult, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
