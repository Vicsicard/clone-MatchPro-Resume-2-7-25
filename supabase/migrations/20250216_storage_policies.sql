-- Enable Row Level Security
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;

-- Create policies for the buckets table
CREATE POLICY "Bucket access for authenticated users" ON storage.buckets
  FOR ALL
  TO authenticated
  USING (true);

-- Create policies for the objects table
CREATE POLICY "User files are accessible by file owner" ON storage.objects
  FOR ALL
  TO authenticated
  USING (auth.uid()::text = (storage.foldername(name))[1]);

-- Grant usage on required schemas
GRANT USAGE ON SCHEMA storage TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA storage TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA storage TO authenticated;

-- Create function to initialize bucket
CREATE OR REPLACE FUNCTION storage.create_user_files_bucket()
RETURNS void AS $$
DECLARE
  bucket_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'user-files'
  ) INTO bucket_exists;

  IF NOT bucket_exists THEN
    INSERT INTO storage.buckets (id, name)
    VALUES ('user-files', 'user-files');
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Run the function to ensure bucket exists
SELECT storage.create_user_files_bucket();
