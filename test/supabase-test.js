import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uzztoxyfbiqqzguzjdwm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV6enRveHlmYmlxcXpndXpqZHdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg5Njc2ODQsImV4cCI6MjA1NDU0MzY4NH0.zrldht4STCesXTjhDLmTj_j4cPCzqh-lgy1sSrzUwUs';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testSupabaseConnection() {
  try {
    console.log('Testing Supabase connection...');
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'vicsicard@gmail.com',
      password: 'Jerrygarcia1993!'
    });

    if (error) {
      console.error('Authentication error:', error.message);
      return;
    }

    console.log('Successfully authenticated!');
    console.log('Session:', data.session ? 'Valid' : 'None');
  } catch (err) {
    console.error('Test failed:', err);
  }
}

testSupabaseConnection();
