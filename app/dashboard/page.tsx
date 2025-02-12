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
  const [analysisStatus, setAnalysisStatus] = useState<'processing' | 'completed' | 'failed' | null>(null);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string>('');

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
          setStatusMessage('Error: Failed to fetch analysis status');
          clearInterval(pollInterval);
          return;
        }

        if (analysis) {
          setAnalysisStatus(analysis.status);
          
          // Update status message based on status
          switch (analysis.status) {
            case 'processing':
              setStatusMessage('Processing your documents...');
              break;
            case 'completed':
              if (analysis.results?.similarity_score) {
                const score = Math.round(analysis.results.similarity_score * 100);
                setStatusMessage(`Analysis complete! Match score: ${score}%`);
              } else {
                setStatusMessage('Analysis complete!');
              }
              setAnalysisResult(analysis.results);
              clearInterval(pollInterval);
              break;
            case 'failed':
              setStatusMessage(`Analysis failed: ${analysis.error || 'Unknown error'}`);
              setError(analysis.error || 'Analysis failed');
              clearInterval(pollInterval);
              break;
            default:
              setStatusMessage('Unknown status');
              break;
          }
        }
      } catch (error: any) {
        console.error('Error polling analysis status:', error);
        setError('Failed to check analysis status');
        setStatusMessage('Error: Failed to check analysis status');
        clearInterval(pollInterval);
      }
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(pollInterval);
  }, [analysisId, supabase]);

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
  }, [router, supabase.auth]);

  useEffect(() => {
    if (analysisResult) {
      console.log('Analysis Result:', analysisResult);
    }
  }, [analysisResult]);

  const handleFileUpload = (type: 'resume' | 'jobDescription', file: File) => {
    setFiles(prev => ({
      ...prev,
      [type]: file
    }));
    setError(null);
    setAnalysisId(null);
    setAnalysisStatus(null);
    setAnalysisResult(null);
    setStatusMessage('');
  };

  const handleAnalysis = async () => {
    if (!files.resume || !files.jobDescription) {
      setError('Please upload both resume and job description');
      setStatusMessage('Error: Please upload both files');
      return;
    }

    setLoading(true);
    setError(null);
    setUploadProgress(0);
    setStatusMessage('Uploading files...');

    try {
      const formData = new FormData();
      formData.append('resume', files.resume);
      formData.append('jobDescription', files.jobDescription);

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        },
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze documents');
      }

      setAnalysisId(data.analysisId);
      setAnalysisStatus(data.status || 'processing');
      
      if (data.status === 'completed' && data.similarity_score) {
        const score = Math.round(data.similarity_score * 100);
        setStatusMessage(`Analysis complete! Match score: ${score}%`);
        setAnalysisResult({ similarity_score: data.similarity_score });
      } else {
        setStatusMessage('Processing your documents...');
      }

    } catch (error: any) {
      console.error('Analysis error:', error);
      setError(error.message || 'Failed to analyze documents');
      setStatusMessage(`Error: ${error.message || 'Failed to analyze documents'}`);
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
                <div className="mt-8">
                  <h2 className="text-xl font-bold mb-4">Analysis Results</h2>
                  <div className="bg-white shadow rounded-lg p-6">
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-gray-700 font-semibold">Match Score:</span>
                        <div className="flex items-center">
                          <div className="w-24 h-2 bg-gray-200 rounded-full mr-2">
                            <div 
                              className={`h-2 rounded-full ${
                                analysisResult.similarity_score * 100 >= 80
                                  ? 'bg-green-500'
                                  : analysisResult.similarity_score * 100 >= 60
                                  ? 'bg-yellow-500'
                                  : 'bg-red-500'
                              }`}
                              style={{
                                width: `${analysisResult.similarity_score * 100}%`,
                              }}
                            />
                          </div>
                          <span className="text-gray-900 font-bold">
                            {Math.round(analysisResult.similarity_score * 100)}%
                          </span>
                        </div>
                      </div>
                      <p className="text-gray-600">
                        {analysisResult.similarity_score * 100 >= 80
                          ? 'Excellent match! Your resume is well-aligned with the job requirements.'
                          : analysisResult.similarity_score * 100 >= 60
                          ? 'Moderate match. Consider updating your resume to better align with the job requirements.'
                          : 'Low match. We recommend significant updates to your resume to better match the job requirements.'}
                      </p>
                    </div>

                    {/* Improvement Suggestions Section */}
                    {(analysisResult.results?.improvement_suggestions || analysisResult.improvement_suggestions) && (
                      <div className="mt-6">
                        <h3 className="text-lg font-semibold mb-3">Suggested Improvements</h3>
                        <div className="space-y-3">
                          {(analysisResult.results?.improvement_suggestions || analysisResult.improvement_suggestions)?.map((suggestion: string, index: number) => (
                            <div key={index} className="flex items-start space-x-2 bg-blue-50 p-3 rounded-lg">
                              <div className="flex-shrink-0 mt-1">
                                <svg className="h-5 w-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              </div>
                              <p className="text-sm text-gray-700">{suggestion}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
