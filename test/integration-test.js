const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: '.env.local' });

const API_URL = 'http://localhost:3002';
const TIMEOUT = 30000; // 30 seconds

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Test user credentials
const TEST_USER = {
  email: 'vicsicard@gmail.com',
  password: 'Jerrygarcia1993!'
};

// Helper function to create timeout promise
const timeout = (ms) => new Promise((_, reject) => 
  setTimeout(() => reject(new Error(`Request timed out after ${ms}ms`)), ms)
);

// Helper function to make API calls with timeout
async function fetchWithTimeout(url, options) {
  try {
    const response = await Promise.race([
      globalThis.fetch(url, options),
      timeout(TIMEOUT)
    ]);
    return response;
  } catch (error) {
    console.error(`Error fetching ${url}:`, error.message);
    throw error;
  }
}

async function loginUser() {
  console.log('Logging in test user...');
  const { data: { session }, error } = await supabase.auth.signInWithPassword(TEST_USER);
  
  if (error) {
    throw new Error(`Login failed: ${error.message}`);
  }
  
  if (!session) {
    throw new Error('No session returned after login');
  }
  
  console.log('Login successful');
  return session.access_token;
}

async function uploadResume(token, filePath) {
  console.log('Uploading resume...');
  
  // Read file as buffer
  const fileBuffer = fs.readFileSync(filePath);
  const fileName = path.basename(filePath);
  
  // Create blob from buffer
  const blob = new Blob([fileBuffer], { type: 'application/pdf' });
  
  // Create FormData
  const formData = new FormData();
  formData.append('file', blob, fileName);

  console.log('Request details:', {
    url: `${API_URL}/api/analyze`,
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  const response = await fetchWithTimeout(`${API_URL}/api/analyze`, {
    method: 'POST',
    body: formData,
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  console.log('Response status:', response.status);
  console.log('Response headers:', response.headers);
  
  const responseText = await response.text();
  console.log('Response text:', responseText);

  if (!response.ok) {
    throw new Error(`Upload failed: ${responseText}`);
  }

  try {
    const result = JSON.parse(responseText);
    console.log('Upload successful:', result);
    return result;
  } catch (error) {
    console.error('Failed to parse response:', error);
    throw new Error(`Invalid response: ${responseText}`);
  }
}

async function optimizeResume(token, analysisId, suggestions) {
  console.log('Optimizing resume...');
  const response = await fetchWithTimeout(`${API_URL}/api/optimize`, {
    method: 'POST',
    body: JSON.stringify({
      analysisId,
      selectedSuggestions: suggestions
    }),
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Optimization failed: ${error.error}`);
  }

  const result = await response.json();
  console.log('Optimization successful:', result);
  return result;
}

async function verifyAnalysisRecord(token, analysisId) {
  console.log('Verifying analysis record...');
  const { data: analysis, error } = await supabase
    .from('analyses')
    .select('*')
    .eq('id', analysisId)
    .single();

  if (error) {
    throw new Error(`Failed to fetch analysis: ${error.message}`);
  }

  if (!analysis) {
    throw new Error('Analysis record not found');
  }

  console.log('Analysis record verified:', {
    id: analysis.id,
    status: analysis.status,
    file_format: analysis.file_format
  });

  return analysis;
}

async function downloadAndVerifyFile(url) {
  console.log('Downloading optimized file...');
  const response = await fetchWithTimeout(url, {
    method: 'GET'
  });

  if (!response.ok) {
    throw new Error('Failed to download optimized file');
  }

  const contentType = response.headers.get('content-type');
  const contentLength = response.headers.get('content-length');

  console.log('File verification:', {
    contentType,
    size: contentLength ? `${Math.round(parseInt(contentLength) / 1024)}KB` : 'unknown'
  });

  return true;
}

async function runIntegrationTest() {
  console.log('Starting integration test...');
  let token;
  let analysisResult;
  let optimizeResult;

  try {
    // Step 1: Login
    token = await loginUser();

    // Step 2: Upload Resume
    const testResumePath = path.join(__dirname, 'test-resume.pdf');
    analysisResult = await uploadResume(token, testResumePath);
    
    // Step 3: Verify Analysis Record
    const analysis = await verifyAnalysisRecord(token, analysisResult.id);
    
    // Step 4: Wait for Analysis to Complete (if needed)
    if (analysis.status === 'processing') {
      console.log('Waiting for analysis to complete...');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    // Step 5: Optimize Resume
    optimizeResult = await optimizeResume(token, analysisResult.id, [1, 2, 3]);
    
    // Step 6: Verify Download URL
    await downloadAndVerifyFile(optimizeResult.downloadUrl);

    console.log('Integration test completed successfully!');
    return true;

  } catch (error) {
    console.error('Integration test failed:', error.message);
    throw error;
  }
}

// Run the test
runIntegrationTest()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
