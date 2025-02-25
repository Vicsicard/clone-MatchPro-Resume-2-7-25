'use client';

import { useState } from 'react';
import ResumeUpload from '@/app/components/ResumeUpload';
import { toast } from 'react-hot-toast';

interface Suggestion {
  suggestion: string;
  details: string;
}

interface AnalysisResult {
  id: string;
  status: string;
  similarityScore: number;
  suggestions: Suggestion[];
}

const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

export default function UploadPage() {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);

  const handleFileSelect = async (file: File | null) => {
    if (!file) {
      setAnalysisResult(null);
      return;
    }

    // Validate file type
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      const errorMessage = `Invalid file type. Please upload a PDF, DOC, DOCX, or TXT file. Received: ${file.type}`;
      setError(errorMessage);
      toast.error(errorMessage);
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('resume', file);
      formData.append('jobDesc', file); // For testing, using same file
      formData.append('userId', 'test-user'); // TODO: Get actual user ID

      console.log('Uploading file:', {
        name: file.name,
        type: file.type,
        size: file.size
      });

      const response = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || `Upload failed: ${response.statusText}`);
      }

      setAnalysisResult(responseData);
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
          accept=".pdf,.doc,.docx,.txt"
        />
        <p className="mt-2 text-sm text-gray-600">
          Supported file types: PDF, DOC, DOCX, TXT
        </p>
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
              {analysisResult.suggestions.map((suggestion, index) => (
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
