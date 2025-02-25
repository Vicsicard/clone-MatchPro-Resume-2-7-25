import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function getSupabaseClient(authHeader?: string | null) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('This endpoint requires a Bearer token');
  }

  const token = authHeader.replace('Bearer ', '');
  if (!token) {
    throw new Error('Invalid Bearer token');
  }

  // Create a client with the user's token
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    },
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  });

  // Verify the token by getting the user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error(userError?.message || 'Invalid authentication token');
  }

  return supabase;
}
