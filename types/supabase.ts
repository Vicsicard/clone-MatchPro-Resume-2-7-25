export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      analyses: {
        Row: {
          id: string
          user_id: string
          file_path: string | null
          file_format: string | null
          job_description_path: string | null
          status: 'uploading' | 'processing' | 'completed' | 'failed'
          error: string | null
          content_json: Json | null
          created_at: string
          updated_at: string
          file_name: string
        }
        Insert: {
          id?: string
          user_id: string
          file_path?: string | null
          file_format?: string | null
          job_description_path?: string | null
          status: 'uploading' | 'processing' | 'completed' | 'failed'
          error?: string | null
          content_json?: Json | null
          created_at?: string
          updated_at?: string
          file_name: string
        }
        Update: {
          id?: string
          user_id?: string
          file_path?: string | null
          file_format?: string | null
          job_description_path?: string | null
          status?: 'uploading' | 'processing' | 'completed' | 'failed'
          error?: string | null
          content_json?: Json | null
          created_at?: string
          updated_at?: string
          file_name?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}