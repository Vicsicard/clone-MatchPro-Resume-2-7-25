-- Create a new storage bucket for optimized resumes
INSERT INTO storage.buckets (id, name, public)
VALUES ('optimized-resumes', 'optimized-resumes', false);

-- Set up storage policies for optimized resumes
CREATE POLICY "Users can upload optimized resumes"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'optimized-resumes' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can read their own optimized resumes"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'optimized-resumes' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update their own optimized resumes"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'optimized-resumes' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own optimized resumes"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'optimized-resumes' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
