'use client'

import { useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react'

export default function ResumeUpload() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [files, setFiles] = useState<{ resume?: File; jobDescription?: File }>({})

  const onDrop = async (acceptedFiles: File[]) => {
    const newFiles = { ...files }
    
    // Determine which file is which based on name or let user specify
    acceptedFiles.forEach(file => {
      if (file.name.toLowerCase().includes('resume')) {
        newFiles.resume = file
      } else {
        newFiles.jobDescription = file
      }
    })
    
    setFiles(newFiles)

    // If we have both files, automatically submit
    if (newFiles.resume && newFiles.jobDescription) {
      await handleSubmit(newFiles)
    }
  }

  const handleSubmit = async (submitFiles: typeof files) => {
    if (!submitFiles.resume || !submitFiles.jobDescription) {
      setError('Please provide both a resume and job description')
      return
    }

    setLoading(true)
    setError(null)
    
    try {
      const formData = new FormData()
      formData.append('resume', submitFiles.resume)
      formData.append('jobDescription', submitFiles.jobDescription)

      const response = await fetch('/api/analyze', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()
      
      if (!response.ok) throw new Error(result.error)
      
      setSuccess(true)
      setFiles({})
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    maxFiles: 2,
    multiple: true
  })

  return (
    <div className="max-w-xl mx-auto p-6">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-500'
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto h-12 w-12 text-gray-400" />
        <p className="mt-4 text-gray-600">
          {isDragActive ? (
            'Drop your files here'
          ) : (
            'Drag & drop your resume and job description PDFs here'
          )}
        </p>
        {(files.resume || files.jobDescription) && (
          <div className="mt-4 space-y-2">
            {files.resume && (
              <div className="flex items-center justify-center gap-2 text-green-600">
                <FileText size={16} />
                <span>Resume uploaded</span>
                <CheckCircle size={16} />
              </div>
            )}
            {files.jobDescription && (
              <div className="flex items-center justify-center gap-2 text-green-600">
                <FileText size={16} />
                <span>Job Description uploaded</span>
                <CheckCircle size={16} />
              </div>
            )}
          </div>
        )}
      </div>

      {loading && (
        <div className="mt-4 text-blue-600 flex items-center justify-center gap-2">
          <span className="animate-spin">⌛</span>
          <span>Analyzing files...</span>
        </div>
      )}
      
      {error && (
        <div className="mt-4 text-red-600 flex items-center justify-center gap-2">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}
      
      {success && (
        <div className="mt-4 text-green-600 flex items-center justify-center gap-2">
          <CheckCircle size={16} />
          <span>Files uploaded successfully! Analysis in progress...</span>
        </div>
      )}
    </div>
  )
}
