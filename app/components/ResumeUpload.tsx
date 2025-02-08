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
    <div className="space-y-4">
      {/* File Upload Area */}
      <div
        {...getRootProps()}
        className={`
          border border-white/20 rounded p-6 transition-colors text-center cursor-pointer
          ${isDragActive ? 'border-white/40 bg-white/5' : 'hover:border-white/40 hover:bg-white/5'}
        `}
        data-testid="dropzone"
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto h-6 w-6 mb-2 text-white/80" />
        <h3 className="text-[15px] font-medium mb-1 text-white">
          {isDragActive ? 'Drop your files here' : 'Upload your files'}
        </h3>
        <p className="text-[13px] text-white/80">
          Drag and drop or click to select
        </p>
      </div>

      {/* File List */}
      {(files.resume || files.jobDescription) && (
        <div className="bg-white/5 rounded p-3 space-y-2">
          {files.resume && (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileText className="h-4 w-4 text-white/70" />
                <span className="text-[13px] text-white/90">{files.resume.name}</span>
              </div>
              <button
                onClick={() => removeFile('resume')}
                className="text-white/50 hover:text-white/80 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          {files.jobDescription && (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileText className="h-4 w-4 text-white/70" />
                <span className="text-[13px] text-white/90">{files.jobDescription.name}</span>
              </div>
              <button
                onClick={() => removeFile('jobDescription')}
                className="text-white/50 hover:text-white/80 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Status Messages */}
      {error && (
        <div className="bg-red-500/10 text-red-100 p-3 rounded flex items-center space-x-2 text-[13px]">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}
      {success && (
        <div className="bg-green-500/10 text-green-100 p-3 rounded flex items-center space-x-2 text-[13px]">
          <CheckCircle className="h-4 w-4 flex-shrink-0" />
          <p>Files processed successfully!</p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center py-2">
          <div className="animate-spin rounded-full h-5 w-5 border border-white/20 border-t-white"></div>
        </div>
      )}

      {/* Submit Button */}
      {(files.resume || files.jobDescription) && !loading && (
        <button
          onClick={() => handleSubmit(files)}
          className="w-full bg-white text-[#2563eb] py-2 px-4 rounded font-medium text-[13px] hover:bg-white/90 transition-colors"
        >
          Start Analysis
        </button>
      )}
    </div>
  )
}
