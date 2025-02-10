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
  const [success, setSuccess] = useState(false);
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [analysisStatus, setAnalysisStatus] = useState<'pending' | 'processing' | 'completed' | 'failed' | null>(null);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [lastProgress, setLastProgress] = useState<string[]>([]);

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
          return;
        }

        if (analysis) {
          setAnalysisStatus(analysis.status);
          
          // Handle progress updates
          if (analysis.results?.progress) {
            setLastProgress(prev => {
              const newProgress = [...prev];
              if (!prev.includes(analysis.results.progress)) {
                newProgress.push(analysis.results.progress);
              }
              return newProgress;
            });
          }
          
          setAnalysisResult(analysis.results);

          if (analysis.status !== 'pending' && analysis.status !== 'processing') {
            clearInterval(pollInterval);
          }
        }
      } catch (error) {
        console.error('Error polling analysis status:', error);
      }
    }, 1000); // Poll every second for more responsive updates

    return () => clearInterval(pollInterval);
  }, [analysisId]);

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
    setError(null);
    setSuccess(false);
  };

  const handleAnalysis = async () => {
    if (!files.resume || !files.jobDescription) {
      setError('Please upload both resume and job description');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);
    setLastProgress([]);

    try {
      console.log('Starting analysis with files:', {
        resume: { name: files.resume.name, type: files.resume.type, size: files.resume.size },
        jobDescription: { name: files.jobDescription.name, type: files.jobDescription.type, size: files.jobDescription.size }
      });

      const formData = new FormData();
      formData.append('resume', files.resume);
      formData.append('jobDescription', files.jobDescription);

      const response = await fetch('/api/analyze', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      console.log('Analysis response:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze files');
      }

      setSuccess(true);
      setAnalysisId(data.analysisId);
      setAnalysisStatus('pending');
      setFiles({});
      console.log('Analysis started successfully:', data);
    } catch (error: any) {
      console.error('Analysis error:', error);
      setError(error.message || 'Failed to analyze files. Please try again.');
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
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Welcome to your Dashboard</h1>
          <p className="text-gray-600 mb-4">
            You are signed in as: {session.user.email}
          </p>
          
          <div className="space-y-8">
            {/* Status Messages */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Error</h3>
                    <div className="mt-2 text-sm text-red-700">
                      <p>{error}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-green-800">Success</h3>
                    <div className="mt-2 text-sm text-green-700">
                      <p>Files uploaded successfully. Analysis has started.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

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
                    disabled={loading}
                    className={`
                      bg-blue-600 text-white px-8 py-3 rounded-lg font-medium
                      ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'}
                      transition-colors
                    `}
                  >
                    {loading ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3"></div>
                        Processing...
                      </div>
                    ) : (
                      'Start Analysis'
                    )}
                  </button>
                </div>
              )}
            </div>
            
            {/* Analysis Status */}
            {analysisId && (
              <div className="bg-gray-50 p-6 rounded-lg">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Analysis Status</h2>
                
                {(analysisStatus === 'pending' || analysisStatus === 'processing') && (
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3 text-blue-600">
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-current border-t-transparent"></div>
                      <p>{analysisStatus === 'pending' ? 'Starting analysis...' : 'Analysis in progress...'}</p>
                    </div>
                    
                    {/* Show progress updates */}
                    {lastProgress.length > 0 && (
                      <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-700">
                        <div className="font-medium mb-2">Progress:</div>
                        <div className="space-y-1 pl-4">
                          {lastProgress.map((progress, index) => (
                            <div key={index} className="flex items-center space-x-2">
                              <span>•</span>
                              <span>{progress}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Show error details if any */}
                    {analysisResult?.error && (
                      <div className="bg-yellow-50 p-3 rounded-lg text-sm text-yellow-700">
                        {analysisResult.error}
                      </div>
                    )}
                  </div>
                )}

                {analysisStatus === 'completed' && analysisResult && (
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2 text-green-600">
                      <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <p className="font-medium">Analysis completed</p>
                    </div>
                    
                    <div className="space-y-6">
                      {/* Match Score */}
                      <div className="bg-white p-4 rounded-lg border border-gray-200">
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Match Score</h3>
                        <div className="flex items-center space-x-2">
                          <div className="text-3xl font-bold text-blue-600">
                            {(analysisResult.score * 100).toFixed(1)}%
                          </div>
                          <div className="text-sm text-gray-500">match with job requirements</div>
                        </div>
                      </div>

                      {/* Key Terms */}
                      {analysisResult.keyTerms && (
                        <div className="bg-white p-4 rounded-lg border border-gray-200">
                          <h3 className="text-lg font-medium text-gray-900 mb-2">Key Terms Found</h3>
                          <div className="flex flex-wrap gap-2">
                            {analysisResult.keyTerms.map((term: string, index: number) => (
                              <span key={index} className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-sm">
                                {term}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Skills Analysis */}
                      {analysisResult.skills && (
                        <div className="bg-white p-4 rounded-lg border border-gray-200">
                          <h3 className="text-lg font-medium text-gray-900 mb-2">Skills Analysis</h3>
                          <div className="space-y-2">
                            {Object.entries(analysisResult.skills).map(([skill, present]: [string, any]) => (
                              <div key={skill} className="flex items-center space-x-2">
                                <span className={`w-2 h-2 rounded-full ${present ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                <span className="text-gray-700">{skill}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Recommendations */}
                      {analysisResult.recommendations && (
                        <div className="bg-white p-4 rounded-lg border border-gray-200">
                          <h3 className="text-lg font-medium text-gray-900 mb-2">Recommendations</h3>
                          <ul className="list-disc list-inside space-y-2 text-gray-600">
                            {analysisResult.recommendations.map((rec: string, index: number) => (
                              <li key={index}>{rec}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Experience Analysis */}
                      {analysisResult.experience && (
                        <div className="bg-white p-4 rounded-lg border border-gray-200">
                          <h3 className="text-lg font-medium text-gray-900 mb-2">Experience Analysis</h3>
                          <div className="prose prose-sm max-w-none text-gray-600">
                            {analysisResult.experience}
                          </div>
                        </div>
                      )}

                      {/* Contact Information */}
                      {analysisResult.contactInfo && (
                        <div className="bg-white p-4 rounded-lg border border-gray-200">
                          <h3 className="text-lg font-medium text-gray-900 mb-2">Contact Information Found</h3>
                          <div className="space-y-2 text-gray-600">
                            {Object.entries(analysisResult.contactInfo).map(([key, value]: [string, any]) => (
                              <div key={key} className="flex items-start">
                                <span className="font-medium w-24">{key}:</span>
                                <span>{value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Detailed Analysis */}
                      {analysisResult.details && (
                        <div className="bg-white p-4 rounded-lg border border-gray-200">
                          <h3 className="text-lg font-medium text-gray-900 mb-2">Detailed Analysis</h3>
                          <pre className="bg-gray-50 p-3 rounded text-sm text-gray-600 overflow-auto whitespace-pre-wrap">
                            {analysisResult.details}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {analysisStatus === 'failed' && (
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2 text-red-600">
                      <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      <p className="font-medium">Analysis failed</p>
                    </div>
                    
                    {/* Show error details */}
                    {analysisResult?.error && (
                      <div className="bg-red-50 p-3 rounded-lg text-sm text-red-700">
                        Error: {analysisResult.error}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
