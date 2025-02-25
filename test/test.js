import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import FormData from 'form-data';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Supabase client
const supabaseUrl = 'https://uzztoxyfbiqqzguzjdwm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV6enRveHlmYmlxcXpndXpqZHdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg5Njc2ODQsImV4cCI6MjA1NDU0MzY4NH0.zrldht4STCesXTjhDLmTj_j4cPCzqh-lgy1sSrzUwUs';
const supabase = createClient(supabaseUrl, supabaseKey);

const API_URL = 'http://localhost:3002';

async function testEndpoints() {
  try {
    // 1. Sign in
    const { data: { session }, error: signInError } = await supabase.auth.signInWithPassword({
      email: 'vicsicard@gmail.com',
      password: 'Jerrygarcia1993!'
    });

    if (signInError) throw signInError;
    if (!session) throw new Error('No session');
    
    console.log('✓ Signed in successfully');

    // 2. Test analyze endpoint
    const formData = new FormData();
    const filePath = path.join(__dirname, 'sample-resume.txt');
    const fileContent = fs.readFileSync(filePath);
    formData.append('file', fileContent, { filename: 'resume.txt' });

    const analyzeResponse = await fetch(`${API_URL}/api/analyze`, {
      method: 'POST',
      body: formData,
      headers: {
        ...formData.getHeaders(),
        'Authorization': `Bearer ${session.access_token}`
      }
    });

    const analyzeResult = await analyzeResponse.json();
    console.log('✓ Analyze endpoint response:', analyzeResult);

    // 3. Test optimize endpoint
    const optimizeResponse = await fetch(`${API_URL}/api/optimize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        analysisId: analyzeResult.id,
        selectedSuggestions: [1, 2]  // Test with first two suggestions
      })
    });

    const optimizeResult = await optimizeResponse.json();
    console.log('✓ Optimize endpoint response:', optimizeResult);

    // 4. Download the optimized file
    if (optimizeResult.downloadUrl) {
      const downloadResponse = await fetch(optimizeResult.downloadUrl);
      const fileData = await downloadResponse.buffer();
      fs.writeFileSync(
        path.join(__dirname, 'optimized-resume.txt'),
        fileData
      );
      console.log('✓ Downloaded optimized resume');
    }

  } catch (error) {
    console.error('Test failed:', error);
  }
}

testEndpoints();
