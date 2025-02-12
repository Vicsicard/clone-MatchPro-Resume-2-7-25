import { createClient } from '@supabase/supabase-js';

export const createBlogClient = () => {
  const blogUrl = process.env.NEXT_PUBLIC_BLOG_SUPABASE_URL;
  const blogKey = process.env.NEXT_PUBLIC_BLOG_SUPABASE_ANON_KEY;

  // Log environment variable status (without exposing values)
  console.log('Blog URL status:', blogUrl ? 'Set' : 'Missing');
  console.log('Blog Key status:', blogKey ? 'Set' : 'Missing');

  if (!blogUrl || !blogKey) {
    throw new Error(
      'Missing required environment variables. Please ensure both NEXT_PUBLIC_BLOG_SUPABASE_URL and NEXT_PUBLIC_BLOG_SUPABASE_ANON_KEY are set in .env.local'
    );
  }

  try {
    // Create Supabase client with public access
    const client = createClient(blogUrl, blogKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      },
      db: {
        schema: 'public'
      }
    });

    // Test the connection
    console.log('Supabase client created successfully');
    return client;
  } catch (error) {
    console.error('Error creating Supabase client:', error);
    throw error;
  }
};
