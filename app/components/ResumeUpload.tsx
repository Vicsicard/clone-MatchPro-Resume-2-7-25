'use client'

import { useState, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FileText, CheckCircle, AlertCircle, X } from 'lucide-react'

interface ResumeUploadProps {
  type: 'resume' | 'jobDescription'
  onFileUpload: (file: File) => void
}

export default function ResumeUpload({ type, onFileUpload }: ResumeUploadProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [file, setFile] = useState<File | null>(null)

  const onDrop = async (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const uploadedFile = acceptedFiles[0];
      setFile(uploadedFile);
      onFileUpload(uploadedFile);
      setSuccess(true);
      setError(null);
    }
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    },
    multiple: false
  })

  const removeFile = () => {
    setFile(null)
    setError(null)
    setSuccess(false)
  }

  return (
    <div className="space-y-4">
      {/* File Upload Area */}
      {!file && (
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed border-gray-300 rounded-lg p-6 transition-colors text-center cursor-pointer
            ${isDragActive ? 'border-blue-500 bg-blue-50' : 'hover:border-gray-400 hover:bg-gray-50'}
          `}
          data-testid="dropzone"
        >
          <input {...getInputProps()} />
          <Upload className="mx-auto h-12 w-12 mb-4 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">
            {isDragActive ? 'Drop your file here' : `Upload your ${type === 'resume' ? 'Resume' : 'Job Description'}`}
          </h3>
          <p className="text-sm text-gray-500">
            Drag and drop or click to select
          </p>
          <p className="text-xs text-gray-400 mt-2">
            Supported formats: PDF, DOC, DOCX (Max 5MB)
          </p>
        </div>
      )}

      {/* File Display */}
      {file && (
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <FileText className="h-6 w-6 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-gray-900">{file.name}</p>
                <p className="text-xs text-gray-500">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
            <button
              onClick={removeFile}
              className="text-gray-400 hover:text-gray-500 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* Status Messages */}
      {error && (
        <div className="bg-red-50 text-red-700 p-3 rounded-lg flex items-center space-x-2 text-sm">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}
      {success && file && (
        <div className="bg-green-50 text-green-700 p-3 rounded-lg flex items-center space-x-2 text-sm">
          <CheckCircle className="h-5 w-5 flex-shrink-0" />
          <p>File uploaded successfully!</p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center py-2">
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-300 border-t-blue-600"></div>
        </div>
      )}
    </div>
  )
}
