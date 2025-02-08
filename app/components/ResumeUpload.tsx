'use client'

import { useState, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FileText, CheckCircle, AlertCircle, X } from 'lucide-react'

export default function ResumeUpload() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [files, setFiles] = useState<{ resume?: File; jobDescription?: File }>({})

  useEffect(() => {
    console.log('ResumeUpload component mounted');
    console.log('Initial files state:', files);
  }, []);

  const onDrop = async (acceptedFiles: File[]) => {
    console.log('Files dropped:', acceptedFiles);
    
    try {
      const newFiles = { ...files }
      
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

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    },
    multiple: true
  })

  const removeFile = (type: 'resume' | 'jobDescription') => {
    setFiles(prev => {
      const newFiles = { ...prev }
      delete newFiles[type]
      return newFiles
    })
    setError(null)
    setSuccess(false)
  }

  return (
    <div className="space-y-6">
      {/* File Upload Area */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-xl p-8 transition-colors text-center cursor-pointer bg-white
          ${isDragActive ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-blue-600'}
        `}
        data-testid="dropzone"
      >
        <input {...getInputProps()} />
        <Upload className={`mx-auto h-12 w-12 mb-4 ${isDragActive ? 'text-blue-600' : 'text-gray-400'}`} />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {isDragActive ? 'Drop your files here' : 'Upload your resume and job description'}
        </h3>
        <p className="text-gray-500">
          Drag and drop or click to select files
        </p>
      </div>

      {/* File List */}
      <div className="space-y-3">
        {files.resume && (
          <div className="flex items-center justify-between bg-white p-4 rounded-lg">
            <div className="flex items-center space-x-3">
              <FileText className="h-5 w-5 text-blue-600" />
              <span className="text-gray-700">{files.resume.name}</span>
            </div>
            <button
              onClick={() => removeFile('resume')}
              className="text-gray-400 hover:text-red-500 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
        {files.jobDescription && (
          <div className="flex items-center justify-between bg-white p-4 rounded-lg">
            <div className="flex items-center space-x-3">
              <FileText className="h-5 w-5 text-blue-600" />
              <span className="text-gray-700">{files.jobDescription.name}</span>
            </div>
            <button
              onClick={() => removeFile('jobDescription')}
              className="text-gray-400 hover:text-red-500 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>

      {/* Status Messages */}
      {error && (
        <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-4 rounded-lg">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}
      {success && (
        <div className="flex items-center space-x-2 text-green-600 bg-green-50 p-4 rounded-lg">
          <CheckCircle className="h-5 w-5 flex-shrink-0" />
          <p>Files processed successfully!</p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* Submit Button */}
      {(files.resume || files.jobDescription) && !loading && (
        <button
          onClick={() => handleSubmit(files)}
          className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
        >
          Start Analysis
        </button>
      )}
    </div>
  )
}
