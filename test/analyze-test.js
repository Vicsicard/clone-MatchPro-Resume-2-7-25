import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import FormData from 'form-data';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = 'https://uzztoxyfbiqqzguzjdwm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV6enRveHlmYmlxcXpndXpqZHdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg5Njc2ODQsImV4cCI6MjA1NDU0MzY4NH0.zrldht4STCesXTjhDLmTj_j4cPCzqh-lgy1sSrzUwUs';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testAnalyzeEndpoint() {
  try {
    console.log('1. Authenticating with Supabase...');
    const { data: { session }, error: signInError } = await supabase.auth.signInWithPassword({
      email: 'vicsicard@gmail.com',
      password: 'Jerrygarcia1993!'
    });

    if (signInError) throw signInError;
    if (!session) throw new Error('No session');
    console.log('✓ Authentication successful');

    console.log('2. Preparing resume file...');
    const formData = new FormData();
    const filePath = path.join(__dirname, 'sample-resume.txt');
    const fileContent = fs.readFileSync(filePath);
    formData.append('file', fileContent, { filename: 'resume.txt' });
    console.log('✓ File prepared');

    console.log('3. Sending request to analyze endpoint...');
    const response = await fetch('http://localhost:3002/api/analyze', {
      method: 'POST',
      body: formData,
      headers: {
        ...formData.getHeaders(),
        'Authorization': `Bearer ${session.access_token}`
      }
    });

    const result = await response.json();
    console.log('Response status:', response.status);
    console.log('Response body:', JSON.stringify(result, null, 2));

  } catch (error) {
    console.error('Test failed:', error);
  }
}

testAnalyzeEndpoint();
