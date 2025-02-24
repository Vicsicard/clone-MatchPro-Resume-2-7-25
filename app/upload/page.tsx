'use client';

import { useState } from 'react';
import ResumeUpload from '@/app/components/ResumeUpload';
import { toast } from 'react-hot-toast';

export default function UploadPage() {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState(null);

  const handleFileSelect = async (file: File | null) => {
    if (!file) {
      setAnalysisResult(null);
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('resume', file);
      formData.append('jobDesc', file); // For testing, using same file
      formData.append('userId', 'test-user'); // TODO: Get actual user ID

      const response = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Upload failed: ${response.statusText}`);
      }

      const result = await response.json();
      setAnalysisResult(result);
      toast.success('Resume analyzed successfully!');
    } catch (err: any) {
      const errorMessage = err.message || 'An error occurred during upload';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('Analysis error:', err);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-[800px]">
      <h1 className="text-3xl font-bold mb-8">Upload Your Resume</h1>
      
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <ResumeUpload
          onFileSelect={handleFileSelect}
          disabled={isUploading}
        />
      </div>

      {isUploading && (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Analyzing your resume...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {analysisResult && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4">Analysis Results</h2>
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium mb-2">Similarity Score</h3>
              <p className="text-lg">{(analysisResult.similarityScore * 100).toFixed(1)}%</p>
            </div>
            
            <div className="space-y-4">
              <h3 className="font-medium">Suggestions</h3>
              {analysisResult.suggestions.map((suggestion: any, index: number) => (
                <div key={index} className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-blue-600">{suggestion.suggestion}</h4>
                  <p className="mt-2 text-gray-700">{suggestion.details}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
