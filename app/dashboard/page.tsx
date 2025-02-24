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
  const [analysisResults, setAnalysisResults] = useState<any>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedSuggestions, setSelectedSuggestions] = useState<string[]>([]);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationProgress, setOptimizationProgress] = useState<string>('');
  const [optimizedResumeUrl, setOptimizedResumeUrl] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

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
    setAnalysisResults(null);
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
      const apiUrl = new URL('/api/analyze', window.location.origin);
      const response = await fetch(apiUrl, {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${session.data.session.access_token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Server error response:', data);
        let errorMessage = 'Failed to analyze resume';
        
        if (data.details) {
          if (data.details.message) {
            errorMessage += `: ${data.details.message}`;
          }
          if (data.details.phase) {
            errorMessage += ` (phase: ${data.details.phase})`;
          }
        }
        
        console.error('Full error details:', data.details);
        throw new Error(errorMessage);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      // Update state with analysis results
      setAnalysisId(data.analysisId);
      setAnalysisStatus('completed');
      setAnalysisResults(data);
      
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
      setError(error instanceof Error ? error.message : 'An unexpected error occurred');
      setStatusMessage(`Error: ${error instanceof Error ? error.message : 'An unexpected error occurred'}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSuggestionSelect = (suggestion: string) => {
    setSelectedSuggestions(prev => {
      if (prev.includes(suggestion)) {
        return prev.filter(s => s !== suggestion);
      } else {
        return [...prev, suggestion];
      }
    });
    // Reset optimization states when selection changes
    setOptimizedResumeUrl(null);
    setOptimizationProgress('');
  };

  const handleOptimize = async () => {
    if (!selectedSuggestions.length || !analysisResults?.id) {
      setNotification({
        type: 'error',
        message: 'Please select at least one suggestion to implement'
      });
      return;
    }
    
    setIsOptimizing(true);
    setOptimizationProgress('Starting optimization...');
    try {
      const response = await fetch('/api/optimize-resume', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          analysisId: analysisResults.id,
          selectedSuggestions: selectedSuggestions
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to optimize resume');
      }

      setOptimizedResumeUrl(data.downloadUrl);
      setOptimizationProgress('Resume optimized successfully!');
      setNotification({
        type: 'success',
        message: 'Resume optimized successfully! Click the download button to get your optimized resume.'
      });
    } catch (error) {
      console.error('Error optimizing resume:', error);
      setOptimizationProgress('');
      setNotification({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to optimize resume'
      });
    } finally {
      setIsOptimizing(false);
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
    if (analysisResults) {
      console.log('Analysis Results:', analysisResults);
    }
  }, [analysisResults]);

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
              setAnalysisResults(analysis.content_json.analysis);
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
        setError(error instanceof Error ? error.message : 'An unexpected error occurred');
        setStatusMessage(`Error: ${error instanceof Error ? error.message : 'An unexpected error occurred'}`);
        clearInterval(pollInterval);
      }
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(pollInterval);
  }, [analysisId, analysisStatus, supabase]);

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {notification && (
        <div className={`fixed top-4 right-4 p-4 rounded-lg shadow-lg ${
          notification.type === 'success' ? 'bg-green-600' : 'bg-red-600'
        } text-white`}>
          <div className="flex items-center">
            {notification.type === 'success' ? (
              <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            <span>{notification.message}</span>
            <button
              onClick={() => setNotification(null)}
              className="ml-4 text-white hover:text-gray-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
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

          {/* Analysis Results */}
          {analysisResults && (
            <div className="mt-8 space-y-6">
              {/* Match Score */}
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <h2 className="text-xl font-semibold mb-4">Match Score</h2>
                <div className="text-3xl font-bold text-blue-600">
                  {Math.round(analysisResults.similarity_score * 100)}%
                </div>
              </div>

              {/* Suggestions */}
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <h2 className="text-xl font-semibold mb-4">Suggestions</h2>
                <div className="space-y-4">
                  {analysisResults.suggestions.map((suggestion: any, index: number) => (
                    <div
                      key={index}
                      className={`p-4 rounded-lg border transition-all ${
                        selectedSuggestions.includes(suggestion.suggestion)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={selectedSuggestions.includes(suggestion.suggestion)}
                              onChange={(e) => {
                                e.stopPropagation();
                                handleSuggestionSelect(suggestion.suggestion);
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="h-4 w-4 text-blue-600 rounded cursor-pointer"
                            />
                            <h4 className="font-medium cursor-pointer" onClick={() => handleSuggestionSelect(suggestion.suggestion)}>
                              {suggestion.suggestion}
                            </h4>
                          </div>
                          <p className="text-gray-600 mt-2 ml-6">{suggestion.details}</p>
                        </div>
                        <div className="flex items-center space-x-2 ml-4">
                          <span className={`px-2 py-1 rounded text-sm ${
                            suggestion.impact === 'High'
                              ? 'bg-red-100 text-red-800'
                              : suggestion.impact === 'Medium'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {suggestion.impact}
                          </span>
                          <span className="px-2 py-1 bg-gray-100 rounded text-sm">
                            {suggestion.category}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Suggestions and Optimization UI */}
              {analysisResults?.suggestions && (
                <div className="mt-8 space-y-6">
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-xl font-semibold">Improvement Suggestions</h3>
                      <button
                        onClick={() => {
                          if (analysisResults.suggestions) {
                            if (selectedSuggestions.length === analysisResults.suggestions.length) {
                              setSelectedSuggestions([]);
                            } else {
                              setSelectedSuggestions(analysisResults.suggestions.map(s => s.suggestion));
                            }
                          }
                        }}
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                      >
                        {selectedSuggestions.length === analysisResults.suggestions.length
                          ? 'Deselect All'
                          : 'Select All'}
                      </button>
                    </div>

                    <div className="space-y-4">
                      {analysisResults.suggestions.map((suggestion, index) => (
                        <div
                          key={index}
                          className={`p-4 rounded-lg border transition-all ${
                            selectedSuggestions.includes(suggestion.suggestion)
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-blue-300'
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  checked={selectedSuggestions.includes(suggestion.suggestion)}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    handleSuggestionSelect(suggestion.suggestion);
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  className="h-4 w-4 text-blue-600 rounded cursor-pointer"
                                />
                                <h4 className="font-medium cursor-pointer" onClick={() => handleSuggestionSelect(suggestion.suggestion)}>
                                  {suggestion.suggestion}
                                </h4>
                              </div>
                              <p className="text-gray-600 mt-2 ml-6">{suggestion.details}</p>
                            </div>
                            <div className="flex items-center space-x-2 ml-4">
                              <span className={`px-2 py-1 rounded text-sm ${
                                suggestion.impact === 'High'
                                  ? 'bg-red-100 text-red-800'
                                  : suggestion.impact === 'Medium'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-green-100 text-green-800'
                              }`}>
                                {suggestion.impact}
                              </span>
                              <span className="px-2 py-1 bg-gray-100 rounded text-sm">
                                {suggestion.category}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-6 space-y-4">
                      {optimizationProgress && (
                        <div className="text-sm text-gray-600">
                          {optimizationProgress}
                        </div>
                      )}
                      
                      <div className="flex justify-between items-center">
                        <button
                          onClick={handleOptimize}
                          disabled={!selectedSuggestions.length || isOptimizing}
                          className={`px-4 py-2 rounded-lg font-medium ${
                            !selectedSuggestions.length || isOptimizing
                              ? 'bg-gray-300 cursor-not-allowed'
                              : 'bg-blue-600 hover:bg-blue-700 text-white'
                          }`}
                        >
                          {isOptimizing ? (
                            <span className="flex items-center">
                              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Optimizing...
                            </span>
                          ) : (
                            `Optimize Selected (${selectedSuggestions.length})`
                          )}
                        </button>
                        
                        {optimizedResumeUrl && (
                          <a
                            href={optimizedResumeUrl}
                            download
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium flex items-center"
                          >
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                            </svg>
                            Download Optimized Resume
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Download Section */}
          {optimizedResumeUrl && (
            <div className="mt-8">
              <h2 className="text-xl font-semibold mb-4">Download Optimized Resume</h2>
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <p className="mb-4">Your optimized resume is ready!</p>
                <a
                  href={optimizedResumeUrl}
                  download
                  className="px-6 py-3 rounded-md text-white font-medium bg-green-600 hover:bg-green-700 inline-block"
                >
                  Download Optimized Resume
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
