import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const adminClient = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export async function ensureStorageBucket() {
  try {
    // Check if bucket exists
    const { data: buckets, error: listError } = await adminClient
      .storage
      .listBuckets();

    if (listError) {
      console.error('Error listing buckets:', listError);
      throw listError;
    }

    const resumesBucket = buckets?.find(b => b.name === 'resumes');
    
    if (!resumesBucket) {
      // Create bucket if it doesn't exist
      const { data, error: createError } = await adminClient
        .storage
        .createBucket('resumes', {
          public: false,
          allowedMimeTypes: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
          fileSizeLimit: 10485760, // 10MB
        });

      if (createError) {
        console.error('Error creating bucket:', createError);
        throw createError;
      }

      // Set up bucket policy
      const { error: policyError } = await adminClient
        .storage
        .from('resumes')
        .createSignedUrl('test.txt', 60);

      if (policyError && !policyError.message.includes('does not exist')) {
        console.error('Error setting bucket policy:', policyError);
        throw policyError;
      }
    }

    return { bucketName: 'resumes' };
  } catch (error) {
    console.error('Storage bucket error:', error);
    throw error;
  }
}

export async function uploadFile(file: File, userId: string, analysisId: string) {
  try {
    // Ensure bucket exists
    await ensureStorageBucket();

    // Determine file format
    const fileFormat = file.name.toLowerCase().endsWith('.pdf') ? 'pdf' : 'docx';
    
    // Create file path
    const filePath = `${userId}/${analysisId}/resume.${fileFormat}`;

    // Upload file
    const { data, error } = await adminClient
      .storage
      .from('resumes')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (error) {
      console.error('Upload error:', error);
      throw error;
    }

    return {
      path: filePath,
      format: fileFormat
    };
  } catch (error) {
    console.error('File upload error:', error);
    throw error;
  }
}

export async function downloadFile(filePath: string): Promise<Blob> {
  try {
    // Ensure bucket exists
    await ensureStorageBucket();

    // Download file
    const { data, error } = await adminClient
      .storage
      .from('resumes')
      .download(filePath);

    if (error) {
      console.error('Download error:', error);
      throw error;
    }

    if (!data) {
      throw new Error('No file data received');
    }

    return data;
  } catch (error) {
    console.error('File download error:', error);
    throw error;
  }
}
