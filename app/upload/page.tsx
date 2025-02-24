'use client';

import { useState } from 'react';
import ResumeUpload from '@/app/components/ResumeUpload';

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
      formData.append('file', file);

      const response = await fetch('http://localhost:3002/api/analyze', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const result = await response.json();
      setAnalysisResult(result);
    } catch (err: any) {
      setError(err.message || 'An error occurred during upload');
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
          <pre className="bg-gray-50 p-4 rounded-lg overflow-auto">
            {JSON.stringify(analysisResult, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
