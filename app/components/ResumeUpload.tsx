'use client'

import { useState, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react'

export default function ResumeUpload() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [files, setFiles] = useState<{ resume?: File; jobDescription?: File }>({})

  useEffect(() => {
    console.log('ResumeUpload component mounted');
    // Log initial state
    console.log('Initial files state:', files);

    // Log component styles
    const dropzone = document.querySelector('[data-testid="dropzone"]');
    if (dropzone) {
      const computedStyle = window.getComputedStyle(dropzone);
      console.log('Dropzone styles:', {
        border: computedStyle.border,
        padding: computedStyle.padding,
        backgroundColor: computedStyle.backgroundColor,
      });
    } else {
      console.warn('Dropzone element not found');
    }
  }, []);

  const onDrop = async (acceptedFiles: File[]) => {
    console.log('Files dropped:', acceptedFiles);
    
    try {
      const newFiles = { ...files }
      
      // Determine which file is which based on name or let user specify
      acceptedFiles.forEach(file => {
        console.log('Processing file:', file.name);
        if (file.name.toLowerCase().includes('resume')) {
          newFiles.resume = file
        } else {
          newFiles.jobDescription = file
        }
      })
      
      setFiles(newFiles)
      console.log('Updated files state:', newFiles);

      // If we have both files, automatically submit
      if (newFiles.resume && newFiles.jobDescription) {
        await handleSubmit(newFiles)
      }
    } catch (error) {
      console.error('Error in onDrop:', error);
      setError('Error processing dropped files');
    }
  }

  const handleSubmit = async (submitFiles: typeof files) => {
    console.log('Handling submit with files:', submitFiles);

    if (!submitFiles.resume || !submitFiles.jobDescription) {
      const error = 'Please provide both a resume and job description';
      console.error(error);
      setError(error);
      return;
    }

    setLoading(true)
    setError(null)
    
    try {
      const formData = new FormData()
      formData.append('resume', submitFiles.resume)
      formData.append('jobDescription', submitFiles.jobDescription)

      console.log('Sending request to /api/analyze');
      const response = await fetch('/api/analyze', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json()
      console.log('Received response:', data);
      
      setSuccess(true)
      setFiles({})
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      setError(error instanceof Error ? error.message : 'An error occurred during submission');
    } finally {
      setLoading(false)
    }
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop })

  return (
    <div data-testid="dropzone" className="max-w-xl mx-auto p-6">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-500'
        }`}
      >
        <input {...getInputProps()} />
        
        {loading ? (
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            <p className="mt-4 text-gray-600">Processing your files...</p>
          </div>
        ) : success ? (
          <div className="flex flex-col items-center text-green-600">
            <CheckCircle size={32} />
            <p className="mt-4">Analysis complete!</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center text-red-600">
            <AlertCircle size={32} />
            <p className="mt-4">{error}</p>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <Upload size={32} className="text-gray-400" />
            <p className="mt-4 text-gray-600">
              {isDragActive
                ? "Drop your files here..."
                : "Drag and drop your resume and job description, or click to select files"}
            </p>
          </div>
        )}

        {/* File List */}
        {(files.resume || files.jobDescription) && !success && !loading && (
          <div className="mt-4 space-y-2">
            {files.resume && (
              <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                <FileText size={16} />
                <span>{files.resume.name}</span>
              </div>
            )}
            {files.jobDescription && (
              <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                <FileText size={16} />
                <span>{files.jobDescription.name}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
