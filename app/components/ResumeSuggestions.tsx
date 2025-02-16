'use client'

import { useState } from 'react'
import { CheckCircle2, Download } from 'lucide-react'

interface Suggestion {
  category: string
  suggestion: string
  rationale: string
  implementation: string
}

interface ResumeSuggestionsProps {
  suggestions: string[]
  onSuggestionSelect: (selectedSuggestion: string) => void
  onDownload: () => void
}

export default function ResumeSuggestions({ suggestions, onSuggestionSelect, onDownload }: ResumeSuggestionsProps) {
  const [selectedSuggestion, setSelectedSuggestion] = useState<string | null>(null)

  const parseSuggestion = (suggestion: string) => {
    const [categoryLine, whyLine, howLine] = suggestion.split('\n')
    const category = categoryLine.split(':')[0]
    const suggestionText = categoryLine.split(':')[1]
    const rationale = whyLine.replace('Why: ', '')
    const implementation = howLine.replace('How: ', '')

    return {
      category,
      suggestion: suggestionText,
      rationale,
      implementation
    }
  }

  const handleSelect = (suggestion: string) => {
    setSelectedSuggestion(suggestion)
    onSuggestionSelect(suggestion)
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {suggestions.map((suggestion, index) => {
          const parsed = parseSuggestion(suggestion)
          const isSelected = suggestion === selectedSuggestion

          return (
            <div
              key={index}
              className={`
                p-4 rounded-lg border transition-all cursor-pointer
                ${isSelected 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                }
              `}
              onClick={() => handleSelect(suggestion)}
            >
              <div className="flex items-start justify-between">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {parsed.category}
                </span>
                {isSelected && (
                  <CheckCircle2 className="h-5 w-5 text-blue-500" />
                )}
              </div>
              
              <div className="mt-3">
                <p className="text-sm font-medium text-gray-900">
                  {parsed.suggestion}
                </p>
                <div className="mt-2 space-y-2">
                  <div>
                    <p className="text-xs font-medium text-gray-500">Why:</p>
                    <p className="text-sm text-gray-600">{parsed.rationale}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500">How:</p>
                    <p className="text-sm text-gray-600">{parsed.implementation}</p>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {selectedSuggestion && (
        <div className="flex justify-center">
          <button
            onClick={onDownload}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Download className="h-4 w-4 mr-2" />
            Download Optimized Resume
          </button>
        </div>
      )}
    </div>
  )
}
