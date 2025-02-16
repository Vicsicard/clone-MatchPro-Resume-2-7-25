'use client';

import { createClient } from '@/app/supabase/client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import ResumeUpload from '@/app/components/ResumeUpload';

export default function Dashboard() {
  const [session, setSession] = useState<any>(null);
  const [files, setFiles] = useState<{
    resume: File | null;
    jobDescription: File | null;
  }>({
    resume: null,
    jobDescription: null
  });
  const [error, setError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [analysisStatus, setAnalysisStatus] = useState<'processing' | 'completed' | 'failed' | null>(null);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<string>>(new Set());
  const [optimizationLoading, setOptimizationLoading] = useState(false);

  const router = useRouter();
  const supabase = createClient();

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
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setUploadProgress(0);
    setStatusMessage('Uploading files...');

    try {
      // Create form data
      const formData = new FormData();
      formData.append('resume', files.resume);
      formData.append('jobDescription', files.jobDescription);

      // Get session for authentication
      const session = await supabase.auth.getSession();
      if (!session.data.session?.access_token) {
        throw new Error('No authentication token available');
      }

      // Start analysis
      const response = await fetch('http://localhost:3000/api/analyze', {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${session.data.session.access_token}`
        }
      });

      const contentType = response.headers.get('content-type');
      if (!response.ok) {
        let errorMessage = 'Failed to analyze resume';
        try {
          if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            errorMessage = errorData.error || errorMessage;
          } else {
            const text = await response.text();
            console.error('Non-JSON error response:', text);
          }
        } catch (e) {
          console.error('Error parsing error response:', e);
        }
        throw new Error(errorMessage);
      }

      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Invalid response format from server');
      }

      const data = await response.json();
      
      // Update state with analysis results
      setAnalysisId(data.analysisId);
      setAnalysisStatus('completed');
      setAnalysisResult(data);
      
      if (data.similarity_score) {
        const score = Math.round(data.similarity_score * 100);
        setStatusMessage(`Analysis complete! Match score: ${score}%`);
      } else {
        setStatusMessage('Analysis complete!');
      }
      
      // Clear file selection
      setFiles({
        resume: null,
        jobDescription: null
      });
      
    } catch (error: any) {
      console.error('Analysis error:', error);
      setError(error.message);
      setStatusMessage(`Error: ${error.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const toggleSuggestion = (suggestion: string) => {
    setSelectedSuggestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(suggestion)) {
        newSet.delete(suggestion);
      } else {
        newSet.add(suggestion);
      }
      return newSet;
    });
  };

  const handleOptimizeResume = async () => {
    if (!session?.access_token || !analysisId || selectedSuggestions.size === 0) {
      return;
    }

    setOptimizationLoading(true);
    setError(null);
    setStatusMessage('Optimizing resume...');

    try {
      const response = await fetch('/api/optimize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          analysisId,
          selectedSuggestions: Array.from(selectedSuggestions)
        })
      });

      if (!response.ok) {
        throw new Error('Failed to optimize resume');
      }

      // Get the optimized file as a blob
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `optimized-${files.resume?.name || 'resume'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setStatusMessage('Resume optimized and downloaded successfully!');
    } catch (error: any) {
      console.error('Optimization error:', error);
      setError(error.message || 'Failed to optimize resume');
      setStatusMessage('Error: Failed to optimize resume');
    } finally {
      setOptimizationLoading(false);
    }
  };

  // Get session on component mount
  useEffect(() => {
    const getSession = async () => {
      try {
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Session error:', error);
          throw error;
        }
        
        if (!currentSession) {
          console.log('No session found, redirecting to sign-in');
          router.push('/auth/sign-in');
          return;
        }
        
        console.log('Session found:', { 
          user: currentSession.user.email,
          expires_at: currentSession.expires_at,
          access_token: currentSession.access_token ? 'present' : 'missing'
        });
        
        setSession(currentSession);
      } catch (error) {
        console.error('Session error:', error);
        router.push('/auth/sign-in');
      }
    };

    getSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('Auth state changed:', { event: _event, hasSession: !!session });
      setSession(session);
      if (!session) {
        router.push('/auth/sign-in');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router, supabase]);

  useEffect(() => {
    if (analysisResult) {
      console.log('Analysis Result:', analysisResult);
    }
  }, [analysisResult]);

  // Poll for analysis status
  useEffect(() => {
    if (!analysisId || analysisStatus === 'completed') return;

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
          
          if (analysis.status === 'completed') {
            clearInterval(pollInterval);
            if (analysis.content_json?.analysis) {
              setAnalysisResult(analysis.content_json.analysis);
              if (analysis.content_json.analysis.similarity_score) {
                const score = Math.round(analysis.content_json.analysis.similarity_score * 100);
                setStatusMessage(`Analysis complete! Match score: ${score}%`);
              } else {
                setStatusMessage('Analysis complete!');
              }
            }
          } else if (analysis.status === 'processing') {
            setStatusMessage('Processing your documents...');
          } else if (analysis.status === 'failed') {
            setStatusMessage(`Analysis failed: ${analysis.error || 'Unknown error'}`);
            setError(analysis.error || 'Analysis failed');
            clearInterval(pollInterval);
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
  }, [analysisId, analysisStatus, supabase]);

  const pollAnalysisStatus = async (analysisId: string) => {
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
        return;
      }

      if (analysis) {
        setAnalysisStatus(analysis.status);
        
        if (analysis.status === 'completed') {
          if (analysis.content_json?.analysis) {
            setAnalysisResult(analysis.content_json.analysis);
            if (analysis.content_json.analysis.similarity_score) {
              const score = Math.round(analysis.content_json.analysis.similarity_score * 100);
              setStatusMessage(`Analysis complete! Match score: ${score}%`);
            } else {
              setStatusMessage('Analysis complete!');
            }
          }
        } else if (analysis.status === 'processing') {
          setStatusMessage('Processing your documents...');
        } else if (analysis.status === 'failed') {
          setStatusMessage(`Analysis failed: ${analysis.error || 'Unknown error'}`);
          setError(analysis.error || 'Analysis failed');
        }
      }
    } catch (error: any) {
      console.error('Error polling analysis status:', error);
      setError('Failed to check analysis status');
      setStatusMessage('Error: Failed to check analysis status');
    }
  };

  const refreshAnalyses = async () => {
    try {
      const { data, error } = await supabase
        .from('analyses')
        .select('*');

      if (error) {
        console.error('Error fetching analyses:', error);
        setError('Failed to fetch analyses');
        setStatusMessage('Error: Failed to fetch analyses');
        return;
      }

      console.log('Analyses:', data);
    } catch (error: any) {
      console.error('Error refreshing analyses:', error);
      setError('Failed to refresh analyses');
      setStatusMessage('Error: Failed to refresh analyses');
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
          
          {/* File Upload Section */}
          <div className="space-y-6">
            {/* Resume Upload */}
            <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Upload Resume</h3>
              <ResumeUpload 
                onFileSelect={(file) => handleFileUpload('resume', file)}
                accept=".pdf,.doc,.docx"
                file={files.resume}
                disabled={isAnalyzing}
              />
            </div>

            {/* Job Description Upload */}
            <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Upload Job Description</h3>
              <ResumeUpload 
                onFileSelect={(file) => handleFileUpload('jobDescription', file)}
                accept=".pdf,.doc,.docx,.txt"
                file={files.jobDescription}
                disabled={isAnalyzing}
              />
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {/* Status Message */}
          {statusMessage && (
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
              <p className="text-blue-700">{statusMessage}</p>
            </div>
          )}

          {/* Upload Progress */}
          {isAnalyzing && (
            <div className="relative pt-1 mb-6">
              <div className="flex mb-2 items-center justify-between">
                <div>
                  <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-blue-600 bg-blue-200">
                    Processing
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

          {/* Analysis Button */}
          <div className="flex justify-center">
            <button
              onClick={handleAnalysis}
              disabled={isAnalyzing || !files.resume || !files.jobDescription}
              className={`px-6 py-3 rounded-md text-white font-medium ${
                isAnalyzing || !files.resume || !files.jobDescription
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isAnalyzing ? 'Processing...' : 'Start Analysis'}
            </button>
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
                    {/* Match Score */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-gray-700 font-semibold">Match Score:</span>
                        <div className="flex items-center">
                          <div className="w-24 h-2 bg-gray-200 rounded-full mr-2">
                            <div 
                              className={`h-2 rounded-full ${
                                (analysisResult.similarity_score || analysisResult.analysis?.similarity_score || 0) * 100 >= 80
                                  ? 'bg-green-500'
                                  : (analysisResult.similarity_score || analysisResult.analysis?.similarity_score || 0) * 100 >= 60
                                  ? 'bg-yellow-500'
                                  : 'bg-red-500'
                              }`}
                              style={{
                                width: `${(analysisResult.similarity_score || analysisResult.analysis?.similarity_score || 0) * 100}%`,
                              }}
                            />
                          </div>
                          <span className="text-gray-900 font-bold">
                            {Math.round((analysisResult.similarity_score || analysisResult.analysis?.similarity_score || 0) * 100)}%
                          </span>
                        </div>
                      </div>
                      <p className="text-gray-600">
                        {(analysisResult.similarity_score || analysisResult.analysis?.similarity_score || 0) * 100 >= 80
                          ? 'Excellent match! Your resume is well-aligned with the job requirements.'
                          : (analysisResult.similarity_score || analysisResult.analysis?.similarity_score || 0) * 100 >= 60
                          ? 'Moderate match. Consider updating your resume to better align with the job requirements.'
                          : 'Low match. We recommend significant updates to your resume to better match the job requirements.'}
                      </p>
                    </div>

                    {/* Improvement Suggestions with Checkboxes */}
                    {((analysisResult.results?.improvement_suggestions || 
                       analysisResult.improvement_suggestions ||
                       analysisResult.suggestions ||
                       analysisResult.analysis?.suggestions) || []).length > 0 && (
                      <div className="mt-6">
                        <h3 className="text-lg font-semibold mb-3">Suggested Improvements</h3>
                        <div className="space-y-3">
                          {(analysisResult.results?.improvement_suggestions || 
                            analysisResult.improvement_suggestions ||
                            analysisResult.suggestions ||
                            analysisResult.analysis?.suggestions || []).map((suggestion: string, index: number) => (
                            <div key={index} className="flex items-start space-x-3 bg-blue-50 p-3 rounded-lg">
                              <div className="flex-shrink-0 mt-1">
                                <input
                                  type="checkbox"
                                  id={`suggestion-${index}`}
                                  checked={selectedSuggestions.has(suggestion)}
                                  onChange={() => toggleSuggestion(suggestion)}
                                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                                />
                              </div>
                              <label 
                                htmlFor={`suggestion-${index}`}
                                className="text-sm text-gray-700 cursor-pointer flex-grow"
                              >
                                {suggestion}
                              </label>
                            </div>
                          ))}
                        </div>

                        {/* Optimize Resume Button */}
                        <div className="mt-4">
                          <button
                            onClick={handleOptimizeResume}
                            disabled={selectedSuggestions.size === 0 || optimizationLoading}
                            className={`w-full px-4 py-2 rounded-md text-white font-medium ${
                              selectedSuggestions.size === 0 || optimizationLoading
                                ? 'bg-gray-400 cursor-not-allowed'
                                : 'bg-blue-600 hover:bg-blue-700'
                            }`}
                          >
                            {optimizationLoading ? (
                              <span className="flex items-center justify-center">
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Optimizing Resume...
                              </span>
                            ) : (
                              'Optimize Resume with Selected Improvements'
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Score Details */}
                    {(analysisResult.score || analysisResult.analysis?.score) && (
                      <div className="mt-6">
                        <h3 className="text-lg font-semibold mb-3">Score Details</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {Object.entries(analysisResult.score || analysisResult.analysis?.score || {}).map(([category, score]) => (
                            <div key={category} className="bg-gray-50 p-4 rounded-lg">
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-medium text-gray-700 capitalize">
                                  {category.replace(/_/g, ' ')}
                                </span>
                                <span className="text-sm font-bold text-gray-900">
                                  {typeof score === 'number' ? `${Math.round(score * 100)}%` : ''}
                                </span>
                              </div>
                              <div className="w-full h-2 bg-gray-200 rounded-full">
                                <div
                                  className={`h-2 rounded-full ${
                                    (typeof score === 'number' ? score : 0) * 100 >= 80
                                      ? 'bg-green-500'
                                      : (typeof score === 'number' ? score : 0) * 100 >= 60
                                      ? 'bg-yellow-500'
                                      : 'bg-red-500'
                                  }`}
                                  style={{
                                    width: `${(typeof score === 'number' ? score : 0) * 100}%`,
                                  }}
                                />
                              </div>
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
