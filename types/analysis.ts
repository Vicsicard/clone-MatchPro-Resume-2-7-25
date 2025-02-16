export type AnalysisStatus = 'processing' | 'completed' | 'failed';
export type FileFormat = 'pdf' | 'docx';

export interface Suggestion {
  id: number;
  category: 'content' | 'format' | 'keywords';
  title: string;
  description: string;
}

export interface AnalysisScore {
  overall: number;  // 0-100
  categories: {
    keywords: number;
    experience: number;
    format: number;
  };
}

export interface Analysis {
  id: string;
  user_id: string;
  file_path: string;
  original_filename: string;
  file_format: FileFormat;
  content_json: {
    raw_text: string;
    suggestions: Suggestion[];
    score: AnalysisScore;
  };
  selected_suggestions: number[];
  status: AnalysisStatus;
  created_at: string;
  updated_at: string;
}

export interface AnalysisResponse {
  id: string;
  suggestions: Suggestion[];
  score: AnalysisScore;
  status: AnalysisStatus;
}
