'use client'

import { useState, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FileText, CheckCircle, AlertCircle, X } from 'lucide-react'

interface ResumeUploadProps {
  onFileSelect: (file: File) => void
  accept: string
  file?: File
}

export default function ResumeUpload({ onFileSelect, accept, file: existingFile }: ResumeUploadProps) {
  const [error, setError] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(existingFile || null)

  useEffect(() => {
    setFile(existingFile || null)
  }, [existingFile])

  const onDrop = async (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const uploadedFile = acceptedFiles[0]
      setFile(uploadedFile)
      onFileSelect(uploadedFile)
      setError(null)
    }
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    multiple: false
  })

  const removeFile = () => {
    setFile(null)
    setError(null)
    onFileSelect(null as any)
  }

  return (
    <div className="space-y-4">
      {!file && (
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed border-gray-300 rounded-lg p-6 transition-colors text-center cursor-pointer
            ${isDragActive ? 'border-blue-500 bg-blue-50' : 'hover:border-gray-400'}
          `}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center justify-center space-y-2">
            <Upload className="h-8 w-8 text-gray-400" />
            <div className="text-sm text-gray-600">
              <span className="font-medium">Click to upload</span> or drag and drop
            </div>
            <p className="text-xs text-gray-500">
              PDF, DOC, or DOCX (max 10MB)
            </p>
          </div>
        </div>
      )}

      {/* File Preview */}
      {file && (
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
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
            className="p-1 rounded-full hover:bg-gray-200"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="flex items-center space-x-2 text-red-600 text-sm">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}
